import { NextResponse } from "next/server";
import { detectRepoRoot } from "@/lib/repoRoot";

export async function GET() {
  const isDemoMode =
    process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  const repoRoot = await detectRepoRoot();

  return NextResponse.json({
    repoRoot: repoRoot ?? null,
    demoMode: isDemoMode,
  });
}
