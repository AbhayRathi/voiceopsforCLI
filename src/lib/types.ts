export type Intent =
  | "pre_push_check"
  | "explain_test_failure"
  | "security_check"
  | "risky_commit_push"
  | "cleanup_delete"
  | "unknown";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type DecisionStatus = "allowed" | "requires_confirmation" | "blocked";

export type PlanStep = {
  id: string;
  title: string;
  command: string;
  purpose: string;
};

export type CommandExecution = {
  id: string;
  command: string;
  purpose: string;
  riskLevel: RiskLevel;
  status: DecisionStatus;
  reason: string;
  stdout: string;
  stderr: string;
  output: string;
  exitCode: number | null;
  durationMs: number;
  executed: boolean;
  usedMock: boolean;
};

export type ReadinessReport = {
  score: number;
  passed: string[];
  warnings: string[];
  fails: string[];
  blockers: string[];
  recommendation: string;
  summary: string;
};

export type EvaluationCategory = {
  name: string;
  score: number;
  status: "pass" | "partial" | "fail";
  explanation: string;
};

export type EvaluationResult = {
  productionOpsScore: number;
  categories: EvaluationCategory[];
  passes: string[];
  partials: string[];
  fails: string[];
  improvements: string[];
  learnedGuardrails: string[];
};

export type SessionEvent = {
  id: string;
  timestamp: string;
  type:
    | "user_utterance"
    | "agent_response"
    | "command_proposed"
    | "command_result"
    | "command_blocked"
    | "evaluation"
    | "guardrail_added";
  detail: string;
};
