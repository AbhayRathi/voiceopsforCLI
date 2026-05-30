import { execFile } from "child_process";
import { promisify } from "util";
import { NextRequest, NextResponse } from "next/server";
import { classifyCommandSafety } from "@/lib/safety";
import { secretScanAllFiles } from "@/lib/secretScan";
import { resolveAuditCommand, isAuditUnavailableError } from "@/lib/audit";

const execFileAsync = promisify(execFile);
const COMMAND_TIMEOUT_MS = 15000;
const MAX_BUFFER = 1024 * 1024;

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

const DEMO_OUTPUTS: Record<string, { output: string; exitCode: number }> = {
  "git status": {
    output:
      "On branch feature/voiceops-demo\nChanges not staged for commit:\n  modified: src/app/page.tsx\n  modified: src/lib/mockData.ts\nUntracked files:\n  src/lib/status.ts",
    exitCode: 0,
  },
  "git diff --stat": {
    output:
      " src/app/page.tsx | 124 +++++++++++++++++++++++\n src/lib/mockData.ts | 78 ++++++++++++++\n 2 files changed, 202 insertions(+)",
    exitCode: 0,
  },
  "git diff --name-only": {
    output: "src/app/page.tsx\nsrc/lib/mockData.ts",
    exitCode: 0,
  },
  "npm test": {
    output:
      "FAIL src/lib/safety.test.ts\n  classifyCommandSafety\n    ✕ blocks rm when called from voice (8ms)\n\nExpected: 'blocked'\nReceived: 'allowed'\n\nTest Suites: 1 failed, 1 total\nTests:       1 failed, 3 passed, 4 total",
    exitCode: 1,
  },
  "npm run lint": {
    output: "⚠ TODO found in src/app/page.tsx — clean up before merge.\nLint passed with warnings.",
    exitCode: 0,
  },
  "npm run audit:mock": {
    output:
      "DEMO-CVE-2024-00001\n  demo-package  <1.0.0  Insecure default configuration\n  severity: moderate\n  fix available via `npm update demo-package`\n\n1 moderate severity vulnerability found.",
    exitCode: 1,
  },
  "npm audit --audit-level=high": {
    output:
      "found 1 high severity vulnerability\n  lodash  <4.17.21  Prototype Pollution\n  fix available via `npm audit fix`",
    exitCode: 1,
  },
  secret_scan_all_files: {
    output:
      "Potential secret findings:\n- Potential secret-like value found in src/config.js. It appears to be marked as fake/demo-only, but should still be reviewed before push.",
    exitCode: 1,
  },
};

const EXECUTION_MAP: Record<string, { file: string; args: string[] }> = {
  pwd: { file: "pwd", args: [] },
  ls: { file: "ls", args: [] },
  "git status": { file: "git", args: ["status"] },
  "git diff --stat": { file: "git", args: ["diff", "--stat"] },
  "git diff --name-only": { file: "git", args: ["diff", "--name-only"] },
  "git branch": { file: "git", args: ["branch"] },
  "git log --oneline -5": { file: "git", args: ["log", "--oneline", "-5"] },
  "cat package.json": { file: "cat", args: ["package.json"] },
  "npm test": { file: "npm", args: ["test"] },
  "npm run test": { file: "npm", args: ["run", "test"] },
  "npm run lint": { file: "npm", args: ["run", "lint"] },
  "find ./logs -type f -mtime +30 -print": { file: "find", args: ["./logs", "-type", "f", "-mtime", "+30", "-print"] },
};

function resolveRepoDir(): string {
  return process.env.VOICEOPS_TARGET_DIR || process.cwd();
}

function formatHelpfulOutput(command: string, stdout: string, stderr: string, exitCode: number | null): string {
  const combined = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");

  if (/Missing script: "lint"/i.test(combined)) return "No lint script found.";
  if (/Missing script: "test"/i.test(combined) || /npm ERR! missing script: test/i.test(combined)) return "No test script found.";
  if (/npm audit/i.test(combined) && /ENOLOCK|requires an existing lockfile/i.test(combined)) {
    return "Dependency audit unavailable: missing lockfile or unsupported project setup.";
  }
  if (/not found/i.test(combined) || /is not recognized/i.test(combined)) {
    return `${command} is unavailable in this environment.`;
  }

  if (!combined && exitCode === 0) return "Command completed successfully.";
  return combined || "Command produced no output.";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { command?: string; purpose?: string; confirmed?: boolean };
  const command = body.command?.trim();

  if (!command) {
    return NextResponse.json({ error: "Command is required." }, { status: 400 });
  }

  const safetyDecision = classifyCommandSafety(command);

  if (safetyDecision.status === "blocked") {
    return NextResponse.json({
      command,
      purpose: body.purpose ?? "",
      riskLevel: safetyDecision.riskLevel,
      status: safetyDecision.status,
      reason: safetyDecision.reason,
      stdout: "",
      stderr: "",
      output: safetyDecision.reason,
      exitCode: null,
      durationMs: 0,
      executed: false,
      usedMock: false,
    });
  }

  if (safetyDecision.status === "requires_confirmation" && !body.confirmed) {
    return NextResponse.json({
      command,
      purpose: body.purpose ?? "",
      riskLevel: safetyDecision.riskLevel,
      status: safetyDecision.status,
      reason: safetyDecision.reason,
      stdout: "",
      stderr: "",
      output: "Explicit confirmation required before execution.",
      exitCode: null,
      durationMs: 0,
      executed: false,
      usedMock: false,
    });
  }

  const start = Date.now();
  const repoDir = resolveRepoDir();

  // DEMO_MODE: return deterministic mock output without executing anything real
  if (isDemoMode()) {
    // In demo mode, show audit:mock output for the audit command to match expected demo behavior
    const demoKey = command === "npm audit --audit-level=high" ? "npm run audit:mock" : command;
    const demoOut = DEMO_OUTPUTS[demoKey];
    if (demoOut) {
      return NextResponse.json({
        command,
        purpose: body.purpose ?? "",
        riskLevel: safetyDecision.riskLevel,
        status: safetyDecision.status,
        reason: safetyDecision.reason,
        stdout: demoOut.output,
        stderr: "",
        output: demoOut.output,
        exitCode: demoOut.exitCode,
        durationMs: Math.floor(Math.random() * 200) + 50,
        executed: true,
        usedMock: true,
      });
    }
    return NextResponse.json({
      command,
      purpose: body.purpose ?? "",
      riskLevel: "high",
      status: "blocked",
      reason: "Command is not in demo allowlist.",
      stdout: "",
      stderr: "",
      output: "Demo mode: command not in demo allowlist.",
      exitCode: null,
      durationMs: 0,
      executed: false,
      usedMock: true,
    });
  }

  try {
    if (command === "secret_scan_all_files") {
      const secretResult = await secretScanAllFiles(repoDir);
      return NextResponse.json({
        command,
        purpose: body.purpose ?? "",
        riskLevel: safetyDecision.riskLevel,
        status: safetyDecision.status,
        reason: safetyDecision.reason,
        stdout: secretResult.output,
        stderr: "",
        output: secretResult.output,
        exitCode: secretResult.exitCode,
        durationMs: Date.now() - start,
        executed: true,
        usedMock: false,
      });
    }

    if (command === "npm audit --audit-level=high") {
      const resolved = await resolveAuditCommand(repoDir);
      const resolvedCmd = resolved.args.join(" ").replace("run ", "npm run ").replace(/^npm /, "npm ");
      const fullCmd = `${resolved.file} ${resolved.args.join(" ")}`;
      try {
        const { stdout, stderr } = await execFileAsync(resolved.file, resolved.args, {
          cwd: repoDir,
          timeout: COMMAND_TIMEOUT_MS,
          maxBuffer: MAX_BUFFER,
        });
        const note = fullCmd !== "npm audit --audit-level=high" ? `[Running ${resolvedCmd} per package.json]\n` : "";
        return NextResponse.json({
          command,
          purpose: body.purpose ?? "",
          riskLevel: safetyDecision.riskLevel,
          status: safetyDecision.status,
          reason: safetyDecision.reason,
          stdout,
          stderr,
          output: note + formatHelpfulOutput(command, stdout, stderr, 0),
          exitCode: 0,
          durationMs: Date.now() - start,
          executed: true,
          usedMock: false,
        });
      } catch (auditError: unknown) {
        const details = auditError as { stdout?: string; stderr?: string; code?: number; killed?: boolean };
        const stdout = details.stdout ?? "";
        const stderr = details.stderr ?? "";
        const exitCode = typeof details.code === "number" ? details.code : null;

        if (isAuditUnavailableError(stderr, stdout)) {
          return NextResponse.json({
            command,
            purpose: body.purpose ?? "",
            riskLevel: safetyDecision.riskLevel,
            status: safetyDecision.status,
            reason: safetyDecision.reason,
            stdout,
            stderr,
            output: "Dependency audit unavailable: missing lockfile or unsupported project setup.",
            exitCode,
            durationMs: Date.now() - start,
            executed: true,
            usedMock: false,
          });
        }

        const note = fullCmd !== "npm audit --audit-level=high" ? `[Running ${resolvedCmd} per package.json]\n` : "";
        return NextResponse.json({
          command,
          purpose: body.purpose ?? "",
          riskLevel: safetyDecision.riskLevel,
          status: safetyDecision.status,
          reason: details.killed ? "Command timed out." : safetyDecision.reason,
          stdout,
          stderr,
          output: note + formatHelpfulOutput(command, stdout, stderr, exitCode),
          exitCode,
          durationMs: Date.now() - start,
          executed: true,
          usedMock: false,
        });
      }
    }

    const executable = EXECUTION_MAP[command];
    if (!executable) {
      return NextResponse.json({
        command,
        purpose: body.purpose ?? "",
        riskLevel: "high",
        status: "blocked",
        reason: "Command is not in executable allowlist.",
        stdout: "",
        stderr: "",
        output: "Command is not in executable allowlist.",
        exitCode: null,
        durationMs: 0,
        executed: false,
        usedMock: false,
      });
    }

    const { stdout, stderr } = await execFileAsync(executable.file, executable.args, {
      cwd: repoDir,
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
    });

    return NextResponse.json({
      command,
      purpose: body.purpose ?? "",
      riskLevel: safetyDecision.riskLevel,
      status: safetyDecision.status,
      reason: safetyDecision.reason,
      stdout,
      stderr,
      output: formatHelpfulOutput(command, stdout, stderr, 0),
      exitCode: 0,
      durationMs: Date.now() - start,
      executed: true,
      usedMock: false,
    });
  } catch (error: unknown) {
    const details = error as { stdout?: string; stderr?: string; code?: number; killed?: boolean };
    const stdout = details.stdout ?? "";
    const stderr = details.stderr ?? "";
    const exitCode = typeof details.code === "number" ? details.code : null;

    return NextResponse.json({
      command,
      purpose: body.purpose ?? "",
      riskLevel: safetyDecision.riskLevel,
      status: safetyDecision.status,
      reason: details.killed ? "Command timed out." : safetyDecision.reason,
      stdout,
      stderr,
      output: formatHelpfulOutput(command, stdout, stderr, exitCode),
      exitCode,
      durationMs: Date.now() - start,
      executed: true,
      usedMock: false,
    });
  }
}
