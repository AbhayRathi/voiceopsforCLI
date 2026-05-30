import { WorkflowStatus } from "./types";

// WORKFLOW_STATUS_ORDER defines the normal happy-path sequence.
// "error" is intentionally excluded — it is a terminal state that can
// interrupt the flow at any point and is rendered separately.
export const WORKFLOW_STATUS_ORDER: WorkflowStatus[] = [
  "idle",
  "listening",
  "transcribing",
  "transcribed",
  "planning",
  "classifying",
  "running_checks",
  "scanning_secrets",
  "generating_report",
  "evaluating",
  "adding_guardrail",
  "complete",
];

export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  idle: "Idle",
  listening: "Listening",
  transcribing: "Transcribing",
  transcribed: "Transcribed",
  planning: "Planning",
  classifying: "Classifying commands",
  running_checks: "Running checks",
  scanning_secrets: "Scanning secrets",
  generating_report: "Generating report",
  evaluating: "Evaluating session",
  adding_guardrail: "Adding guardrail",
  complete: "Complete",
  error: "Error",
};

export const STATUS_ICONS: Record<WorkflowStatus, string> = {
  idle: "◦",
  listening: "🎙",
  transcribing: "✍",
  transcribed: "📝",
  planning: "🧠",
  classifying: "🔍",
  running_checks: "⚙",
  scanning_secrets: "🔐",
  generating_report: "📊",
  evaluating: "🏆",
  adding_guardrail: "🛡",
  complete: "✅",
  error: "❌",
};
