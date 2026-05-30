import { SessionEvent } from "@/lib/types";

type Props = {
  events: SessionEvent[];
};

export default function SessionTimeline({ events }: Props) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
      <h2 className="text-lg font-semibold">Session timeline</h2>
      <ol className="mt-3 space-y-2">
        {events.length === 0 ? (
          <li className="text-sm text-slate-400">No events yet.</li>
        ) : (
          events.map((event) => (
            <li key={event.id} className="rounded border border-slate-700 bg-slate-950 p-2 text-sm">
              <p className="text-xs text-slate-400">{event.timestamp}</p>
              <p className="font-medium capitalize text-slate-100">{event.type.replaceAll("_", " ")}</p>
              <p className="text-slate-300">{event.detail}</p>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
