"use client";

import React, { useState } from "react";
import { EvaluationResult } from "@/lib/evaluation/types";

type Props = {
  evaluation: EvaluationResult | null;
  onEvaluate: () => void;
};

function statusBadge(status: "pass" | "partial" | "fail"): string {
  if (status === "pass") return "bg-emerald-700";
  if (status === "partial") return "bg-amber-700";
  return "bg-rose-700";
}

function providerBadge(evaluation: EvaluationResult): React.ReactNode {
  if (evaluation.provider === "local" && !evaluation.fallbackUsed) {
    return <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-200">Evaluator: Local</span>;
  }
  if (evaluation.provider === "cekura" && evaluation.connected && !evaluation.fallbackUsed) {
    return <span className="rounded bg-emerald-700 px-2 py-0.5 text-xs text-white">Evaluator: Cekura Connected</span>;
  }
  return (
    <span className="rounded bg-amber-700 px-2 py-0.5 text-xs text-white">
      Evaluator: Cekura unavailable — Local fallback
    </span>
  );
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
          <div className="flex items-center gap-2">
            {providerBadge(evaluation)}
          </div>
          <div className="rounded border border-violet-700 bg-violet-950/40 p-3">
            <p className="text-slate-100">Production Ops Score</p>
            <p className="text-2xl font-bold text-violet-300">{evaluation.score}/100</p>
          </div>
          {evaluation.categories.length > 0 && (
            <div className="space-y-1">
              {evaluation.categories.map((category) => (
                <div key={category.name} className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs text-white ${statusBadge(category.status)}`}>
                    {category.status}
                  </span>
                  <span className="text-slate-200">{category.name}</span>
                </div>
              ))}
            </div>
          )}
          {evaluation.failures.length > 0 && (
            <div className="rounded border border-rose-800 bg-rose-950/30 p-2">
              <p className="font-medium text-rose-300">Failures</p>
              <ul className="list-disc pl-5 text-slate-200">
                {evaluation.failures.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {evaluation.learnedGuardrails.length > 0 && (
            <div className="rounded border border-emerald-800 bg-emerald-950/30 p-2">
              <p className="font-medium text-emerald-300">
                🛡 {evaluation.learnedGuardrails.length} guardrail{evaluation.learnedGuardrails.length !== 1 ? "s" : ""} learned
              </p>
              <ul className="list-disc pl-5 text-slate-200">
                {evaluation.learnedGuardrails.map((g) => <li key={g}>{g}</li>)}
              </ul>
            </div>
          )}
          {evaluation.summary && (
            <p className="text-xs text-slate-400">{evaluation.summary}</p>
          )}
          <p className="text-xs text-slate-500 italic">
            VoiceOps normalizes each voice session into an evaluator payload so external QA systems like Cekura can score safety, reliability, and improvement behavior.
          </p>
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
                    </div>
                    <p className="mt-1 text-slate-300">{category.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {evaluation.rawProviderResult != null && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-slate-400 underline hover:text-slate-200">
                Raw evaluator response
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-300">
                {JSON.stringify(evaluation.rawProviderResult, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

