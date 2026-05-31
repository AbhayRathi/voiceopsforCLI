import { Intent } from "./types";

const intentMatchers: Array<{ intent: Intent; patterns: RegExp[] }> = [
  {
    intent: "pre_push_check",
    patterns: [
      /safe to push/i,
      /ready to push/i,
      /ready to ship/i,
      /check this repo/i,
      /inspect this repo/i,
      /health check/i,
      /run pre.?push check/i,
      /check this pr/i,
      /is this pr safe/i,
      /check if this pr is safe/i,
      /can i merge this/i,
      /is this ready to merge/i,
      /should i push this/i,
      /should i ship this/i,
    ],
  },
  {
    intent: "explain_test_failure",
    patterns: [
      /explain (the )?test failure/i,
      /explain the failure/i,
      /why did tests fail/i,
      /why (are|is) (the )?tests? failing/i,
      /what broke/i,
      /explain the error/i,
      /what does this failure mean/i,
      /summarize the test output/i,
      /help me understand the failing test/i,
    ],
  },
  {
    intent: "security_check",
    patterns: [
      /check (for )?security/i,
      /scan (for )?secrets/i,
      /any secrets/i,
      /check (for )?vulnerabilit/i,
      /scan vulnerabilit/i,
      /dependency audit/i,
      /audit dependencies/i,
      /security issues/i,
      /leaked (token|secret)/i,
    ],
  },
  {
    intent: "risky_commit_push",
    patterns: [
      /commit everything/i,
      /commit and push/i,
      /push this/i,
      /ship it/i,
      /merge this/i,
      /publish this/i,
      /send it to github/i,
      /push to github/i,
      /commit all changes/i,
      /make a commit/i,
    ],
  },
  {
    intent: "cleanup_delete",
    patterns: [
      /clean everything up/i,
      /\bclean ?up\b/i,
      /delete (old )?logs/i,
      /remove cache/i,
      /clear temp files/i,
      /cleanup repo/i,
      /clean the repo/i,
      /remove old files/i,
      /delete files/i,
    ],
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
