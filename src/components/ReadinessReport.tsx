import { ReadinessReport as ReadinessReportType } from "@/lib/types";

type Props = {
  report: ReadinessReportType | null;
};

export default function ReadinessReport({ report }: Props) {
  return (
    <section className="rounded-xl border-2 border-cyan-700/60 bg-slate-900 p-6 shadow-xl ring-1 ring-cyan-900/40">
      <h2 className="text-xl font-bold text-cyan-100">Readiness report panel</h2>
      {!report ? (
        <p className="mt-2 text-sm text-slate-400">Run “Check if this repo is safe to push” to generate report.</p>
      ) : (
        <div className="mt-4 space-y-4 text-sm">
          <div className="rounded-lg border border-cyan-600 bg-cyan-950/60 p-4">
            <p className="text-sm font-medium text-slate-200">Push Readiness Score</p>
            <p className="mt-1 text-4xl font-bold text-cyan-300">{report.score}/100</p>
            <p className="mt-2 text-sm text-slate-300">{report.summary}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded border border-emerald-800 bg-emerald-950/30 p-3">
              <p className="font-semibold text-emerald-300">Passed</p>
              <ul className="mt-1 list-disc pl-5 text-slate-200">{report.passed.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="rounded border border-amber-800 bg-amber-950/30 p-3">
              <p className="font-semibold text-amber-300">Warnings</p>
              <ul className="mt-1 list-disc pl-5 text-slate-200">{report.warnings.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="rounded border border-rose-800 bg-rose-950/30 p-3">
              <p className="font-semibold text-rose-300">Main blockers</p>
              <ul className="mt-1 list-disc pl-5 text-slate-200">{report.blockers.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
          <p className="rounded border border-cyan-800 bg-cyan-950/30 p-3 font-medium text-cyan-100">
            <span className="text-slate-300">Recommended next action: </span>{report.recommendation}
          </p>
        </div>
      )}
    </section>
  );
}
