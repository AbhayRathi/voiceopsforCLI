import { PlanStep } from "@/lib/types";

type Props = {
  intent: string;
  explanation: string;
  steps: PlanStep[];
};

export default function AgentPlan({ intent, explanation, steps }: Props) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
      <h2 className="text-lg font-semibold">Agent plan panel</h2>
      <p className="mt-2 text-sm text-slate-300">
        <span className="font-medium text-slate-100">Detected intent:</span> {intent || "—"}
      </p>
      <p className="mt-2 text-sm text-slate-300">{explanation || "Awaiting request."}</p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-200">
        {steps.length ? steps.map((step) => <li key={step.id}>{step.title}</li>) : <li>No active plan.</li>}
      </ol>
    </section>
  );
}
