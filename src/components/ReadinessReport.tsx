import { ReadinessReport as ReadinessReportType } from "@/lib/types";

type Props = {
  report: ReadinessReportType | null;
};

function deriveFindings(report: ReadinessReportType) {
  const items: { icon: string; label: string; detail: string }[] = [];
  if (report.passed.some((p) => p.toLowerCase().includes("git status"))) {
    items.push({ icon: "📂", label: "Git status", detail: "checked — changes detected" });
  }
  if (report.warnings.some((w) => w.toLowerCase().includes("tests failed")) || report.blockers.some((b) => b.toLowerCase().includes("failing"))) {
    items.push({ icon: "❌", label: "Tests", detail: "failing test run detected" });
  } else if (report.passed.some((p) => p.toLowerCase().includes("tests passed"))) {
    items.push({ icon: "✅", label: "Tests", detail: "all tests passing" });
  }
  if (report.warnings.some((w) => w.toLowerCase().includes("lint"))) {
    items.push({ icon: "⚠️", label: "Lint", detail: "lint issues or missing lint script" });
  } else if (report.passed.some((p) => p.toLowerCase().includes("lint passed"))) {
    items.push({ icon: "✅", label: "Lint", detail: "lint passed" });
  }
  if (report.warnings.some((w) => w.toLowerCase().includes("audit") || w.toLowerCase().includes("vulnerabilit"))) {
    items.push({ icon: "🔒", label: "Audit", detail: "dependency vulnerability warning" });
  } else if (report.passed.some((p) => p.toLowerCase().includes("audit"))) {
    items.push({ icon: "✅", label: "Audit", detail: "no issues found" });
  }
  if (report.warnings.some((w) => w.toLowerCase().includes("secret"))) {
    items.push({ icon: "🔍", label: "Secret scan", detail: "review secret scan warnings" });
  } else if (report.passed.some((p) => p.toLowerCase().includes("secret"))) {
    items.push({ icon: "✅", label: "Secret scan", detail: "no obvious secrets found" });
  }
  return items;
}

function deriveFixes(report: ReadinessReportType) {
  const items: string[] = [];
  if (report.blockers.some((b) => b.toLowerCase().includes("failing"))) {
    items.push("Fix failing tests before pushing.");
  }
  if (report.warnings.some((w) => w.toLowerCase().includes("secret"))) {
    items.push("Review and resolve any secret scan warnings.");
  }
  if (report.warnings.some((w) => w.toLowerCase().includes("lint"))) {
    items.push("Address lint issues or TODOs.");
  }
  if (report.warnings.some((w) => w.toLowerCase().includes("audit") || w.toLowerCase().includes("vulnerabilit"))) {
    items.push("Review dependency audit warnings.");
  }
  if (report.blockers.length > 0) {
    items.push("Do not push until all blockers are resolved.");
  }
  return items;
}

export default function ReadinessReport({ report }: Props) {
  const findings = report ? deriveFindings(report) : [];
  const fixes = report ? deriveFixes(report) : [];

  return (
    <section className="rounded-xl border-2 border-cyan-700/60 bg-slate-900 p-6 shadow-xl ring-1 ring-cyan-900/40">
      <h2 className="text-xl font-bold text-cyan-100">Readiness report panel</h2>
      {!report ? (
        <p className="mt-2 text-sm text-slate-400">Run &quot;Check if this repo is safe to push&quot; to generate report.</p>
      ) : (
        <div className="mt-4 space-y-4 text-sm">
          <div className="rounded-lg border border-cyan-600 bg-cyan-950/60 p-4">
            <p className="text-sm font-medium text-slate-200">Push Readiness Score</p>
            <p className="mt-1 text-4xl font-bold text-cyan-300">{report.score}/100</p>
            <p className="mt-2 text-sm text-slate-300">{report.summary}</p>
          </div>

          {/* What VoiceOps Found */}
          {findings.length > 0 && (
          <div className="rounded-lg border border-slate-600 bg-slate-800/60 p-4">
            <h3 className="mb-2 text-base font-semibold text-cyan-200">🔎 What VoiceOps found</h3>
            <ul className="space-y-1">
              {findings.map((f) => (
                <li key={f.label} className="flex items-start gap-2 text-slate-200">
                  <span>{f.icon}</span>
                  <span><span className="font-medium text-slate-100">{f.label}:</span> {f.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          )}

          {/* Recommended Fixes */}
          {fixes.length > 0 && (
          <div className="rounded-lg border border-amber-700/60 bg-amber-950/30 p-4">
            <h3 className="mb-2 text-base font-semibold text-amber-200">🛠 Recommended fixes</h3>
            <ol className="list-decimal space-y-1 pl-5 text-slate-200">
              {fixes.map((fix) => (
                <li key={fix}>{fix}</li>
              ))}
            </ol>
          </div>
          )}

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
