export type BlockedPatternEntry = {
  pattern: string;
  reason: string;
  category: "Destructive" | "Privilege Escalation" | "State-changing" | "Shell Injection" | "System" | "Containment";
};

export const BLOCKED_PATTERNS: BlockedPatternEntry[] = [
  { pattern: "rm", reason: "Destructive delete command", category: "Destructive" },
  { pattern: "rm -rf", reason: "Recursive force delete — catastrophic data loss", category: "Destructive" },
  { pattern: "sudo", reason: "Privileged escalation is blocked", category: "Privilege Escalation" },
  { pattern: "chmod", reason: "Permission modification is blocked", category: "System" },
  { pattern: "chown", reason: "Ownership modification is blocked", category: "System" },
  { pattern: "git push", reason: "git push requires typed confirmation (CONFIRM PUSH)", category: "State-changing" },
  { pattern: "curl | sh", reason: "Pipe to shell interpreter is a remote code execution risk", category: "Shell Injection" },
  { pattern: "wget | sh", reason: "Pipe to shell interpreter is a remote code execution risk", category: "Shell Injection" },
  { pattern: "dd", reason: "Low-level disk command can destroy data irreversibly", category: "Destructive" },
  { pattern: "shutdown", reason: "System shutdown is blocked", category: "System" },
  { pattern: "reboot", reason: "System reboot is blocked", category: "System" },
  { pattern: "Destructive file ops", reason: "Any voice-triggered file deletion is blocked", category: "Destructive" },
  { pattern: "Commands outside repo root", reason: "Execution is restricted to the repo working directory", category: "Containment" },
  { pattern: "Unsafe pipes and redirects", reason: "File-overwriting redirects (>, >>) are blocked", category: "Shell Injection" },
];

export const SAFETY_POLICY_HEADLINE =
  "VoiceOps only runs allowlisted commands automatically. Risky actions require typed confirmation or are blocked.";

export const CATEGORY_COLORS: Record<BlockedPatternEntry["category"], string> = {
  Destructive: "bg-red-700",
  "Privilege Escalation": "bg-rose-700",
  "State-changing": "bg-amber-700",
  "Shell Injection": "bg-orange-700",
  System: "bg-rose-800",
  Containment: "bg-slate-600",
};
