import { DecisionStatus, RiskLevel } from "./types";

export type SafetyDecision = {
  riskLevel: RiskLevel;
  status: DecisionStatus;
  reason: string;
};

const blockedPatterns: Array<{ pattern: RegExp; reason: string; risk: RiskLevel }> = [
  { pattern: /^\s*git\s+push(\s|$)/i, reason: "git push is blocked in MVP safety mode.", risk: "high" },
  { pattern: /(^|\s)rm(\s|$)/i, reason: "Destructive delete command is blocked.", risk: "critical" },
  { pattern: /(^|\s)sudo(\s|$)/i, reason: "Privileged command is blocked.", risk: "critical" },
  { pattern: /(^|\s)(chmod|chown|kill|pkill|dd|shutdown|reboot)(\s|$)/i, reason: "Critical system command is blocked.", risk: "critical" },
  { pattern: /\|\s*(sh|bash|zsh|node|python|python3)(\s|$)/i, reason: "Pipe to interpreter is blocked.", risk: "critical" },
  { pattern: /(>|>>)\s*[^\s]/, reason: "File-overwriting redirection is blocked.", risk: "high" },
];

const mediumPatterns: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /^\s*git\s+add(\s|$)/i, reason: "State-changing git staging requires confirmation." },
  { pattern: /^\s*git\s+commit(\s|$)/i, reason: "Committing changes requires confirmation." },
  { pattern: /^\s*npm\s+(install|update)(\s|$)/i, reason: "Dependency modification requires confirmation." },
  { pattern: /^\s*git\s+checkout\s+-b(\s|$)/i, reason: "Branch creation requires confirmation." },
  { pattern: /^\s*git\s+stash(\s|$)/i, reason: "Stashing modifies working tree state." },
];

const allowList: RegExp[] = [
  /^\s*pwd\s*$/i,
  /^\s*ls(\s+.*)?$/i,
  /^\s*git\s+status(\s+.*)?$/i,
  /^\s*git\s+diff\s+--stat\s*$/i,
  /^\s*git\s+diff\s+--name-only\s*$/i,
  /^\s*git\s+branch(\s+.*)?$/i,
  /^\s*git\s+log\s+--oneline\s+-5\s*$/i,
  /^\s*cat\s+package\.json\s*$/i,
  /^\s*npm\s+test(\s+.*)?$/i,
  /^\s*npm\s+run\s+test(\s+.*)?$/i,
  /^\s*npm\s+run\s+lint(\s+.*)?$/i,
  /^\s*npm\s+audit\s+--audit-level=high\s*$/i,
  /^\s*npm\s+run\s+audit:mock\s*$/i,
  /^\s*find\s+\.\/logs\s+-type\s+f\s+-mtime\s+\+30\s+-print\s*$/i,
  /^\s*secret_scan_all_files\s*$/i,
];

export function classifyCommandSafety(command: string): SafetyDecision {
  const trimmed = command.trim();

  for (const blocked of blockedPatterns) {
    if (blocked.pattern.test(trimmed)) {
      return { riskLevel: blocked.risk, status: "blocked", reason: blocked.reason };
    }
  }

  for (const medium of mediumPatterns) {
    if (medium.pattern.test(trimmed)) {
      return { riskLevel: "medium", status: "requires_confirmation", reason: medium.reason };
    }
  }

  if (allowList.some((pattern) => pattern.test(trimmed))) {
    return { riskLevel: "low", status: "allowed", reason: "Allowlisted safe diagnostic command." };
  }

  return {
    riskLevel: "high",
    status: "blocked",
    reason: "Command is not in the allowlist for guarded execution.",
  };
}

export const baseSafetyPolicy = [
  "Allow only explicit safe diagnostic commands.",
  "Require confirmation for state-changing commands.",
  "Block destructive or privileged commands from voice input.",
  "Never execute git push in this MVP.",
  "Never execute deletion commands from voice input.",
];
