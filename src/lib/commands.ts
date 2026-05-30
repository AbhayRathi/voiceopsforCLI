import { CommandExecution, Intent, PlanStep, ReadinessReport } from "./types";

export function buildPlan(intent: Intent): { explanation: string; steps: PlanStep[] } {
  switch (intent) {
    case "pre_push_check":
      return {
        explanation:
          "I’ll run a pre-push health check: git status, diff summary, tests, lint, dependency audit, and secret scan. These are read-only or safe commands. Starting now.",
        steps: [
          { id: "git_status", title: "Check git status", command: "git status", purpose: "Inspect staged/unstaged/untracked changes" },
          { id: "diff_stat", title: "Summarize changed files", command: "git diff --stat", purpose: "Understand change volume" },
          { id: "diff_names", title: "List changed files", command: "git diff --name-only", purpose: "Gather changed filenames" },
          { id: "tests", title: "Run tests", command: "npm test", purpose: "Validate behavior before push" },
          { id: "lint", title: "Run lint if available", command: "npm run lint", purpose: "Check static quality" },
          {
            id: "audit",
            title: "Run dependency audit if available",
            command: "npm audit --audit-level=high",
            purpose: "Check dependency vulnerabilities",
          },
          {
            id: "secret_scan",
            title: "Scan all repo files for possible secrets",
            command: "secret_scan_all_files",
            purpose: "Detect leaked credentials across the entire repo",
          },
        ],
      };
    case "security_check":
      return {
        explanation: "I'll run a focused security check: dependency audit and a secret scan on all repo files.",
        steps: [
          {
            id: "audit",
            title: "Run dependency audit",
            command: "npm audit --audit-level=high",
            purpose: "Find high-severity dependency issues",
          },
          {
            id: "secret_scan",
            title: "Scan all repo files for secrets",
            command: "secret_scan_all_files",
            purpose: "Detect potential token or key leaks",
          },
        ],
      };
    default:
      return { explanation: "No command execution required for this request.", steps: [] };
  }
}

export function summarizeReadiness(results: CommandExecution[]): ReadinessReport {
  const passed: string[] = [];
  const warnings: string[] = [];
  const fails: string[] = [];
  const blockers: string[] = [];

  const byId = Object.fromEntries(results.map((result) => [result.id, result]));

  if (byId.git_status?.executed) passed.push("Git status checked");
  if (byId.diff_stat?.executed || byId.diff_names?.executed) passed.push("Changed files summarized");

  const secretOutput = byId.secret_scan?.output.toLowerCase() ?? "";
  if (secretOutput.includes("no obvious secrets")) {
    passed.push("No obvious secrets found");
  } else if (byId.secret_scan) {
    warnings.push("Secret scan returned warnings");
  }

  const testResult = byId.tests;
  if (testResult) {
    if (testResult.exitCode === 0) passed.push("Tests passed");
    else {
      warnings.push("Tests failed");
      blockers.push("Failing tests");
    }
  }

  const lintResult = byId.lint;
  if (lintResult) {
    if (lintResult.output.includes("No lint script found")) warnings.push("Lint script not found");
    else if (lintResult.exitCode === 0) passed.push("Lint passed");
    else warnings.push("Lint reported issues");
  }

  const auditResult = byId.audit;
  if (auditResult) {
    if (auditResult.exitCode === 0) passed.push("Dependency audit completed");
    else warnings.push("npm audit returned vulnerabilities or was unavailable");
  }

  results
    .filter((result) => result.status === "blocked")
    .forEach((result) => {
      warnings.push(`Blocked: ${result.command}`);
    });

  if (!results.length) {
    fails.push("No checks were run.");
    blockers.push("Missing pre-push diagnostics");
  }

  let score = 100;
  score -= blockers.length * 20;
  score -= warnings.length * 6;
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    passed,
    warnings,
    fails,
    blockers,
    recommendation:
      blockers.length > 0
        ? "Do not push yet. Fix the top blocker first and rerun checks."
        : "Push looks reasonably safe. Consider one more quick smoke check before pushing.",
    summary:
      blockers.length > 0
        ? `Push readiness is limited by: ${blockers.join(", ")}.`
        : "No hard blockers detected in current checks.",
  };
}
