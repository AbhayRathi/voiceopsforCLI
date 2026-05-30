import { WorkflowStatus } from "@/lib/types";
import { STATUS_ICONS, STATUS_LABELS } from "@/lib/status";

type Props = {
  currentStatus: WorkflowStatus;
  statusHistory: WorkflowStatus[];
};

function statusClass(status: WorkflowStatus, current: WorkflowStatus, history: WorkflowStatus[]): string {
  if (status === "error" && current === "error") return "text-red-400 font-semibold animate-pulse";
  if (status === current && status !== "idle") return "text-cyan-300 font-semibold";
  if (history.includes(status)) return "text-emerald-400";
  return "text-slate-600";
}

export default function StatusTimeline({ currentStatus, statusHistory }: Props) {
  const displayStatuses: WorkflowStatus[] = [
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

  if (currentStatus === "error") {
    displayStatuses.push("error");
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
      <h2 className="text-lg font-semibold">Workflow status</h2>
      <p className="mt-1 text-xs text-slate-400">Live streaming state indicator</p>
      <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {displayStatuses.map((status) => {
          const isCompleted = statusHistory.includes(status) && status !== currentStatus;
          const isCurrent = status === currentStatus;
          return (
            <li
              key={status}
              className={`flex items-center gap-1 text-xs ${statusClass(status, currentStatus, statusHistory)}`}
            >
              <span>{isCompleted ? "✓" : STATUS_ICONS[status]}</span>
              <span>{STATUS_LABELS[status]}</span>
              {isCurrent && status !== "idle" && (
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm">
        <span className="font-medium text-slate-200">Current state:</span>{" "}
        <span className={currentStatus === "error" ? "text-red-400" : "text-cyan-300"}>
          {STATUS_ICONS[currentStatus]} {STATUS_LABELS[currentStatus]}
        </span>
      </p>
    </section>
  );
}
