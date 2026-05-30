import { LatencyMetrics } from "./types";

export function startTimer(): number {
  return Date.now();
}

export function elapsed(start: number): number {
  return Date.now() - start;
}

export function emptyLatency(): LatencyMetrics {
  return {
    transcriptionMs: null,
    planningMs: null,
    executionMs: null,
    evaluationMs: null,
    totalMs: null,
    isPreset: false,
  };
}

export function formatLatency(ms: number | null, isPreset = false): string {
  if (isPreset) return "preset";
  if (ms === null) return "n/a";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
