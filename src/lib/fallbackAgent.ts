import { Intent } from "./types";

export type FallbackResponse = {
  summary: string;
  spokenSummary: string;
};

const responses: Record<Intent | "default", FallbackResponse> = {
  pre_push_check: {
    summary: "Running pre-push health check: git status, diff, tests, lint, audit, and secret scan.",
    spokenSummary: "I'm running a pre-push check now.",
  },
  explain_test_failure: {
    summary: "Explaining the latest test failure in plain English based on captured output.",
    spokenSummary: "Let me explain the test failure.",
  },
  security_check: {
    summary: "Running dependency audit and secret scan on changed files.",
    spokenSummary: "I'm checking for security issues now.",
  },
  risky_commit_push: {
    summary: "This is a high-risk state-changing operation. Typed confirmation is required before any action.",
    spokenSummary: "I can't push without typed confirmation.",
  },
  cleanup_delete: {
    summary: "Cleanup request detected. I will preview deletion candidates only. No files will be deleted from voice input.",
    spokenSummary: "I won't delete anything without explicit confirmation.",
  },
  unknown: {
    summary: "Intent unclear. Ask a concise clarification question.",
    spokenSummary: "Can you clarify what you want me to check?",
  },
  default: {
    summary: "Processing your request.",
    spokenSummary: "On it.",
  },
};

export function getFallbackResponse(intent: Intent): FallbackResponse {
  return responses[intent] ?? responses["default"];
}

export function getReadinessSpokenSummary(score: number, hasBlockers: boolean, testsFailed: boolean, secretWarning = false): string {
  if (testsFailed) return `Tests failed, so this repo is not ready to push. Score is ${score} out of 100.`;
  if (hasBlockers) return `Push readiness score is ${score} out of 100. Fix blockers before pushing.`;
  if (secretWarning) return `Score is ${score} out of 100. Review the secret scan warning before pushing.`;
  return `Push readiness score is ${score} out of 100. Looks reasonably safe.`;
}

export function getEvaluationSpokenSummary(score: number, guardrailCount: number): string {
  const guardrailText =
    guardrailCount > 0 ? ` I added ${guardrailCount} guardrail${guardrailCount > 1 ? "s" : ""}.` : "";
  return `Session score is ${score} out of 100.${guardrailText}`;
}

export function generateFallbackSummary(intent: Intent): FallbackResponse {
  return getFallbackResponse(intent);
}
