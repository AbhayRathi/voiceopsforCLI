import { BLOCKED_PATTERNS, CATEGORY_COLORS, SAFETY_POLICY_HEADLINE } from "@/lib/safetyPolicy";

export default function SafetyPolicyPanel() {
  return (
    <section className="rounded-xl border border-red-900/60 bg-slate-900/80 p-4 shadow-lg">
      <h2 className="text-lg font-semibold text-red-300">Safety policy</h2>
      <p className="mt-1 text-sm text-slate-300">{SAFETY_POLICY_HEADLINE}</p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="pb-1 pr-3 font-medium">Blocked pattern</th>
              <th className="pb-1 pr-3 font-medium">Category</th>
              <th className="pb-1 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {BLOCKED_PATTERNS.map((entry) => (
              <tr key={entry.pattern} className="text-slate-300">
                <td className="py-1 pr-3 font-mono font-semibold text-rose-300">{entry.pattern}</td>
                <td className="py-1 pr-3">
                  <span className={`rounded px-1.5 py-0.5 text-white ${CATEGORY_COLORS[entry.category]}`}>
                    {entry.category}
                  </span>
                </td>
                <td className="py-1 text-slate-400">{entry.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
