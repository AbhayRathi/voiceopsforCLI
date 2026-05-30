export function mergeGuardrails(current: string[], learned: string[]): string[] {
  const merged = new Set(current);
  learned.forEach((rule) => merged.add(rule));
  return Array.from(merged);
}
