import { SessionEvent } from "@/lib/types";

type Props = {
  events: SessionEvent[];
};

const EVENT_COLORS: Partial<Record<SessionEvent["type"], string>> = {
  user_utterance: "border-cyan-700 bg-cyan-950/30",
  transcript_finalized: "border-cyan-700 bg-cyan-950/20",
  intent_detected: "border-violet-700 bg-violet-950/30",
  plan_created: "border-violet-700 bg-violet-950/20",
  agent_response: "border-slate-600 bg-slate-950",
  command_proposed: "border-slate-600 bg-slate-950",
  risk_classified: "border-amber-700 bg-amber-950/30",
  command_allowed: "border-emerald-700 bg-emerald-950/30",
  command_result: "border-slate-600 bg-slate-950",
  command_blocked: "border-red-700 bg-red-950/30",
  confirmation_required: "border-amber-600 bg-amber-950/40",
  command_executed: "border-emerald-700 bg-emerald-950/20",
  report_generated: "border-cyan-700 bg-cyan-950/30",
  evaluation: "border-violet-600 bg-violet-950/40",
  guardrail_added: "border-emerald-600 bg-emerald-950/40",
  error: "border-red-600 bg-red-950/40",
};

const EVENT_ICONS: Partial<Record<SessionEvent["type"], string>> = {
  user_utterance: "🎙",
  transcript_finalized: "📝",
  intent_detected: "🧠",
  plan_created: "📋",
  agent_response: "🤖",
  command_proposed: "⚙",
  risk_classified: "🔍",
  command_allowed: "✅",
  command_result: "📤",
  command_blocked: "🚫",
  confirmation_required: "⚠️",
  command_executed: "▶️",
  report_generated: "📊",
  evaluation: "🏆",
  guardrail_added: "🛡",
  error: "❌",
};

export default function SessionTimeline({ events }: Props) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
      <h2 className="text-lg font-semibold">Session audit log</h2>
      <p className="mt-1 text-xs text-slate-400">Chronological record of all session events</p>
      <ol className="mt-3 max-h-96 space-y-1.5 overflow-y-auto">
        {events.length === 0 ? (
          <li className="text-sm text-slate-400">No events yet.</li>
        ) : (
          events.map((event) => (
            <li
              key={event.id}
              className={`rounded border p-2 text-sm ${EVENT_COLORS[event.type] ?? "border-slate-700 bg-slate-950"}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{EVENT_ICONS[event.type] ?? "•"}</span>
                <span className="font-medium capitalize text-slate-100">
                  {event.type.replaceAll("_", " ")}
                </span>
                <span className="ml-auto text-xs text-slate-500">{event.timestamp}</span>
              </div>
              <p className="mt-0.5 text-slate-300">{event.detail}</p>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}

