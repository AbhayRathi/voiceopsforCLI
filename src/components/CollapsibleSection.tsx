"use client";

import { useState } from "react";

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export default function CollapsibleSection({ title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-left shadow transition-colors hover:bg-slate-800/60"
        aria-expanded={open}
      >
        <span className="text-base font-semibold text-slate-200">{title}</span>
        <span className="text-xs text-slate-500">{open ? "▲ hide" : "▼ show"}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
