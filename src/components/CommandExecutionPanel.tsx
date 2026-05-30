import { CommandExecution } from "@/lib/types";

type Props = {
  commands: CommandExecution[];
};

function riskColor(risk: CommandExecution["riskLevel"]): string {
  if (risk === "critical") return "bg-red-700";
  if (risk === "high") return "bg-rose-700";
  if (risk === "medium") return "bg-amber-700";
  return "bg-emerald-700";
}

function statusColor(status: CommandExecution["status"]): string {
  if (status === "blocked") return "bg-red-700";
  if (status === "requires_confirmation") return "bg-amber-700";
  return "bg-emerald-700";
}

export default function CommandExecutionPanel({ commands }: Props) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
      <h2 className="text-lg font-semibold">Command execution panel</h2>
      <div className="mt-3 space-y-3">
        {commands.length === 0 ? (
          <p className="text-sm text-slate-400">No commands yet.</p>
        ) : (
          commands.map((command) => (
            <article key={command.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded bg-slate-800 px-2 py-1 font-mono text-slate-200">{command.command}</span>
                <span className={`rounded px-2 py-1 text-white ${riskColor(command.riskLevel)}`}>Risk: {command.riskLevel}</span>
                <span className={`rounded px-2 py-1 text-white ${statusColor(command.status)}`}>Status: {command.status}</span>
                <span className="rounded bg-slate-700 px-2 py-1 text-slate-100">{command.durationMs}ms</span>
                {command.usedMock ? <span className="rounded bg-indigo-700 px-2 py-1 text-white">mock fallback</span> : null}
              </div>
              <p className="mt-2 text-sm text-slate-300">
                <span className="font-medium text-slate-100">Purpose:</span> {command.purpose}
              </p>
              <p className="text-sm text-slate-300">
                <span className="font-medium text-slate-100">Reason:</span> {command.reason}
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-black p-2 text-xs text-emerald-300">{command.output || "(no output)"}</pre>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
