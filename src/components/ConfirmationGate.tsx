"use client";

import { useState } from "react";
import { PendingConfirmation } from "@/lib/types";

type Props = {
  confirmation: PendingConfirmation | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmationGate({ confirmation, onConfirm, onCancel }: Props) {
  const [typed, setTyped] = useState("");

  if (!confirmation) return null;

  const matched = typed.trim().toUpperCase() === confirmation.phrase;

  const handleConfirm = () => {
    if (!matched) return;
    setTyped("");
    onConfirm();
  };

  const handleCancel = () => {
    setTyped("");
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-amber-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-lg font-bold text-amber-300">Confirmation required</h3>
            <p className="mt-1 text-sm text-slate-300">
              <span className="font-medium text-slate-100">Action:</span> {confirmation.action}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded border border-amber-800/60 bg-amber-950/30 p-3 text-sm text-amber-200">
          {confirmation.reason}
        </div>

        <p className="mt-4 text-sm text-slate-300">{confirmation.description}</p>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-200">
            Type exactly to confirm:{" "}
            <span className="rounded bg-slate-800 px-2 py-0.5 font-mono font-bold text-amber-300">
              {confirmation.phrase}
            </span>
          </p>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            placeholder={confirmation.phrase}
            className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none"
            autoFocus
          />
          {typed && !matched && (
            <p className="mt-1 text-xs text-red-400">Phrase does not match. Type exactly as shown.</p>
          )}
          {matched && <p className="mt-1 text-xs text-emerald-400">✓ Phrase matched.</p>}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!matched}
            className="flex-1 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
