import { CommandExecution } from "@/lib/types";

type Props = {
  policy: string[];
  learnedGuardrails: string[];
  latestRiskDecision: string;
  commands: CommandExecution[];
};

export default function SafetyPanel({ policy, learnedGuardrails, latestRiskDecision, commands }: Props) {
  const blocked = commands.filter((command) => command.status === "blocked");

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
      <h2 className="text-lg font-semibold">Risk / guardrail panel</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-slate-100">Current safety policy</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-300">
            {policy.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-100">Learned guardrails</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-300">
            {learnedGuardrails.length ? learnedGuardrails.map((item) => <li key={item}>{item}</li>) : <li>None yet.</li>}
          </ul>
        </div>
      </div>

      <p className="mt-3 rounded border border-amber-700 bg-amber-950/40 p-2 text-sm text-amber-200">
        <span className="font-medium">Latest risky action decision:</span> {latestRiskDecision || "No risky action yet."}
      </p>

      <div className="mt-3">
        <p className="text-sm font-medium text-slate-100">Blocked commands</p>
        <ul className="mt-1 list-disc pl-5 text-sm text-slate-300">
          {blocked.length ? blocked.map((command) => <li key={command.id}>{command.command}</li>) : <li>None</li>}
        </ul>
      </div>
    </section>
  );
}
