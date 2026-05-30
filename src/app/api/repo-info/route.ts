import { NextResponse } from "next/server";
import { detectRepoRoot } from "@/lib/repoRoot";

export async function GET() {
  const isDemoMode =
    process.env.DEMO_MODE === "true" ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  // VOICEOPS_TARGET_DIR takes priority so the header always matches
  // where commands actually execute. Falls back to git rev-parse.
  const repoRoot =
    process.env.VOICEOPS_TARGET_DIR ?? (await detectRepoRoot()) ?? null;

  return NextResponse.json({ repoRoot, demoMode: isDemoMode });
}
