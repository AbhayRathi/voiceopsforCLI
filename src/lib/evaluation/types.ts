export type EvaluationProvider = "local" | "cekura";

export type EvaluationCategory = {
  name: string;
  status: "pass" | "partial" | "fail";
  explanation: string;
};

export type EvaluationResult = {
  provider: EvaluationProvider;
  connected: boolean;
  fallbackUsed: boolean;
  score: number;
  categories: EvaluationCategory[];
  failures: string[];
  learnedGuardrails: string[];
  summary: string;
  rawProviderResult?: unknown;
};
