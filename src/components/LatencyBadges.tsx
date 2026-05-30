import { LatencyMetrics } from "@/lib/types";
import { formatLatency } from "@/lib/latency";

type Props = {
  metrics: LatencyMetrics;
};

type Badge = {
  label: string;
  value: string;
  color: string;
};

function latencyColor(ms: number | null): string {
  if (ms === null) return "bg-slate-700 text-slate-400";
  if (ms < 500) return "bg-emerald-900/60 border-emerald-700 text-emerald-300";
  if (ms < 2000) return "bg-cyan-900/60 border-cyan-700 text-cyan-300";
  if (ms < 5000) return "bg-amber-900/60 border-amber-700 text-amber-300";
  return "bg-rose-900/60 border-rose-700 text-rose-300";
}

export default function LatencyBadges({ metrics }: Props) {
  const badges: Badge[] = [
    {
      label: "Transcription",
      value: metrics.isPreset ? "preset" : formatLatency(metrics.transcriptionMs),
      color: metrics.isPreset ? "bg-indigo-900/60 border-indigo-700 text-indigo-300" : latencyColor(metrics.transcriptionMs),
    },
    {
      label: "Planning",
      value: formatLatency(metrics.planningMs),
      color: latencyColor(metrics.planningMs),
    },
    {
      label: "Execution",
      value: formatLatency(metrics.executionMs),
      color: latencyColor(metrics.executionMs),
    },
    {
      label: "Evaluation",
      value: formatLatency(metrics.evaluationMs),
      color: latencyColor(metrics.evaluationMs),
    },
    {
      label: "Total session",
      value: formatLatency(metrics.totalMs),
      color: latencyColor(metrics.totalMs),
    },
  ];

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
      <h2 className="text-lg font-semibold">Latency metrics</h2>
      <p className="mt-1 text-xs text-slate-400">Approximate timing for each pipeline stage</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {badges.map((badge) => (
          <div
            key={badge.label}
            className={`flex flex-col items-center rounded-lg border px-4 py-2 ${badge.color}`}
          >
            <span className="text-xs font-medium opacity-80">{badge.label}</span>
            <span className="mt-0.5 text-lg font-bold tabular-nums">{badge.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
