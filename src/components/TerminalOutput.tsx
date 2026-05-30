type Props = {
  lines: string[];
};

export default function TerminalOutput({ lines }: Props) {
  return (
    <section className="rounded-xl border border-slate-700 bg-black/90 p-4 shadow-lg">
      <h2 className="text-lg font-semibold text-slate-100">Terminal output panel</h2>
      <div className="mt-3 h-48 overflow-y-auto rounded border border-slate-800 bg-black p-3 font-mono text-xs text-emerald-300">
        {lines.length ? lines.map((line, index) => <div key={index}>{line}</div>) : <div>$ waiting for command execution...</div>}
      </div>
    </section>
  );
}
