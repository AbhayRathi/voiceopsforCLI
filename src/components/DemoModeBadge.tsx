export default function DemoModeBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500 bg-yellow-950/60 px-3 py-1 text-xs font-bold uppercase tracking-widest text-yellow-300 shadow">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
      DEMO MODE
    </span>
  );
}
