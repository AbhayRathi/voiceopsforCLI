"use client";

import { useState } from "react";
import { EvaluationResult } from "@/lib/types";

type Props = {
  evaluation: EvaluationResult | null;
  onEvaluate: () => void;
};

function statusBadge(status: "pass" | "partial" | "fail"): string {
  if (status === "pass") return "bg-emerald-700";
  if (status === "partial") return "bg-amber-700";
  return "bg-rose-700";
}

export default function EvaluationPanel({ evaluation, onEvaluate }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Evaluation panel</h2>
        <button
          type="button"
          onClick={onEvaluate}
          className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white"
        >
          Evaluate Session
        </button>
      </div>

      {!evaluation ? (
        <p className="mt-2 text-sm text-slate-400">Run a few interactions, then evaluate.</p>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          <div className="rounded border border-violet-700 bg-violet-950/40 p-3">
            <p className="text-slate-100">Production Ops Score</p>
            <p className="text-2xl font-bold text-violet-300">{evaluation.productionOpsScore}/100</p>
          </div>
          {evaluation.learnedGuardrails.length > 0 && (
            <p className="text-xs text-emerald-300">
              <span aria-hidden="true">🛡 </span>
              {evaluation.learnedGuardrails.length} guardrail{evaluation.learnedGuardrails.length !== 1 ? "s" : ""} learned this session
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="text-xs text-slate-400 underline hover:text-slate-200"
          >
            {showDetails ? "▲ hide full report" : "▼ show full report"}
          </button>
          {showDetails && (
            <div className="space-y-3">
              <div className="space-y-2">
                {evaluation.categories.map((category) => (
                  <div key={category.name} className="rounded border border-slate-700 bg-slate-950 p-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-100">{category.name}</p>
                      <span className={`rounded px-2 py-0.5 text-xs text-white ${statusBadge(category.status)}`}>{category.status}</span>
                      <span className="text-xs text-slate-400">{category.score}/100</span>
                    </div>
                    <p className="mt-1 text-slate-300">{category.explanation}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded border border-emerald-800 bg-emerald-950/30 p-2">
                  <p className="font-medium text-emerald-300">Pass</p>
                  <ul className="list-disc pl-5 text-slate-200">{evaluation.passes.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div className="rounded border border-amber-800 bg-amber-950/30 p-2">
                  <p className="font-medium text-amber-300">Partial</p>
                  <ul className="list-disc pl-5 text-slate-200">{evaluation.partials.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div className="rounded border border-rose-800 bg-rose-950/30 p-2">
                  <p className="font-medium text-rose-300">Fail</p>
                  <ul className="list-disc pl-5 text-slate-200">{evaluation.fails.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
