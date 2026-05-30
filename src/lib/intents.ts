import { Intent } from "./types";

const intentMatchers: Array<{ intent: Intent; patterns: RegExp[] }> = [
  {
    intent: "pre_push_check",
    patterns: [
      /safe to push/i,
      /ready to push/i,
      /health check/i,
      /check this repo/i,
      /check if this pr is safe/i,
      /check this pr/i,
    ],
  },
  {
    intent: "explain_test_failure",
    patterns: [/explain (the )?test failure/i, /why are tests failing/i, /what broke/i, /explain the error/i],
  },
  {
    intent: "security_check",
    patterns: [/check for security issues/i, /scan for secrets/i, /check vulnerabilities/i],
  },
  {
    intent: "risky_commit_push",
    patterns: [/commit everything/i, /push this/i, /commit and push/i, /merge this/i, /ship it/i],
  },
  {
    intent: "cleanup_delete",
    patterns: [/delete old logs/i, /clean everything up/i, /remove cache/i, /delete files/i],
  },
];

export function detectIntent(utterance: string): Intent {
  const normalized = utterance.trim();
  if (!normalized) return "unknown";

  for (const matcher of intentMatchers) {
    if (matcher.patterns.some((pattern) => pattern.test(normalized))) {
      return matcher.intent;
    }
  }

  return "unknown";
}

export function intentLabel(intent: Intent): string {
  return intent.replaceAll("_", " ");
}
