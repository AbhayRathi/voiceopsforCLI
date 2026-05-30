import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { NextRequest, NextResponse } from "next/server";
import { classifyCommandSafety } from "@/lib/safety";

const execFileAsync = promisify(execFile);
const COMMAND_TIMEOUT_MS = 15000;
const MAX_BUFFER = 1024 * 1024;
const MAX_CHANGED_FILES = 30;
const MAX_SCAN_FILE_SIZE_BYTES = 1024 * 1024;

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
  "npm audit --audit-level=high": { file: "npm", args: ["audit", "--audit-level=high"] },
  "find ./logs -type f -mtime +30 -print": { file: "find", args: ["./logs", "-type", "f", "-mtime", "+30", "-print"] },
};

function resolveRepoDir(): string {
  return process.env.VOICEOPS_TARGET_DIR || process.cwd();
}

async function secretScanChangedFiles(repoDir: string): Promise<{ output: string; exitCode: number }> {
  const diff = await execFileAsync("git", ["diff", "--name-only"], { cwd: repoDir, timeout: 5000, maxBuffer: MAX_BUFFER }).catch(() => ({ stdout: "" }));
  const changedFiles = (diff.stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_CHANGED_FILES);

  if (!changedFiles.length) {
    return { output: "No changed files found for secret scan.", exitCode: 0 };
  }

  const secretRegexes: Array<{ label: string; regex: RegExp }> = [
    { label: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/ },
    { label: "Private Key Block", regex: /-----BEGIN[\s\w-]*PRIVATE KEY-----/i },
    { label: "Generic API Key", regex: /(api[_-]?key|token|secret)\s*[:=]\s*["'][^"']{10,}["']/i },
  ];

  const findings: string[] = [];
  const skippedLargeFiles: string[] = [];

  for (const file of changedFiles) {
    const absolutePath = path.join(repoDir, file);
    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) continue;
      if (stat.size > MAX_SCAN_FILE_SIZE_BYTES) {
        skippedLargeFiles.push(file);
        continue;
      }
      const content = await fs.readFile(absolutePath, "utf8");

      for (const secretRegex of secretRegexes) {
        if (secretRegex.regex.test(content)) {
          findings.push(`${secretRegex.label} pattern in ${file}`);
        }
      }
    } catch {
      continue;
    }
  }

  const skipNote = skippedLargeFiles.length
    ? `\nSkipped ${skippedLargeFiles.length} large file(s) (>1MB): ${skippedLargeFiles.join(", ")}`
    : "";

  if (!findings.length) {
    return { output: `No obvious secrets found in changed files.${skipNote}`.trim(), exitCode: 0 };
  }

  return {
    output: `Potential secret findings:\n${findings.map((finding) => `- ${finding}`).join("\n")}${skipNote}`.trim(),
    exitCode: 1,
  };
}

function formatHelpfulOutput(command: string, stdout: string, stderr: string, exitCode: number | null): string {
  const combined = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");

  if (/Missing script: "lint"/i.test(combined)) return "No lint script found.";
  if (/Missing script: "test"/i.test(combined) || /npm ERR! missing script: test/i.test(combined)) return "No test script found.";
  if (/npm audit/i.test(combined) && /ENOLOCK|requires an existing lockfile/i.test(combined)) {
    return "npm audit unavailable because a lockfile is missing.";
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

  try {
    if (command === "secret_scan_changed_files") {
      const secretResult = await secretScanChangedFiles(repoDir);
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
