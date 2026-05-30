import { CommandExecution } from "./types";

const fallbackByStep: Record<string, Partial<CommandExecution>> = {
  git_status: {
    output: "On branch feature/voiceops-guard\nChanges not staged for commit:\n  modified: src/app/page.tsx\nUntracked files:\n  src/lib/evaluator.ts",
    exitCode: 0,
  },
  diff_stat: {
    output: " src/app/page.tsx | 124 +++++++++++++++++++++++\n src/lib/evaluator.ts | 78 ++++++++++++++\n 2 files changed, 202 insertions(+)",
    exitCode: 0,
  },
  diff_names: {
    output: "src/app/page.tsx\nsrc/lib/evaluator.ts",
    exitCode: 0,
  },
  tests: {
    output:
      "FAIL src/lib/safety.test.ts\n  classifyCommandSafety\n    ✕ blocks push when tests are failing\n\nExpected high risk for git push, got medium",
    exitCode: 1,
  },
  lint: {
    output: "No lint script found.",
    exitCode: 0,
  },
  audit: {
    output: "npm audit unavailable or returned vulnerabilities.\n1 high severity vulnerability found.",
    exitCode: 1,
  },
  secret_scan: {
    output: "No obvious secrets found in scanned files.",
    exitCode: 0,
  },
};

export function applyMockFallback(result: CommandExecution): CommandExecution {
  const fallback = fallbackByStep[result.id];
  if (!fallback) return result;

  const shouldFallback =
    !result.executed ||
    result.output.includes("No test script found") ||
    result.output.includes("No lint script found") ||
    result.output.includes("npm audit unavailable") ||
    result.output.includes("command not found");

  if (!shouldFallback) return result;

  return {
    ...result,
    output: `${result.output}\n\n[Mock fallback]\n${fallback.output ?? ""}`.trim(),
    exitCode: fallback.exitCode ?? result.exitCode,
    usedMock: true,
  };
}
