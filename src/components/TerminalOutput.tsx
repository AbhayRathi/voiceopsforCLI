"use client";

import { useEffect, useRef } from "react";

type Props = {
  lines: string[];
};

export default function TerminalOutput({ lines }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <section className="rounded-xl border border-slate-700 bg-black/90 p-4 shadow-lg">
      <h2 className="text-lg font-semibold text-slate-100">Terminal output panel</h2>
      <div className="mt-3 h-48 overflow-y-auto rounded border border-slate-800 bg-black p-3 font-mono text-xs">
        {lines.length ? (
          lines.map((line, index) => (
            <div
              key={index}
              className={
                line.startsWith("$ ")
                  ? "text-cyan-300 font-bold mt-1"
                  : line === ""
                    ? "h-1"
                    : "text-emerald-300"
              }
            >
              {line || "\u00A0"}
            </div>
          ))
        ) : (
          <div className="text-slate-500">$ waiting for command execution...</div>
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
