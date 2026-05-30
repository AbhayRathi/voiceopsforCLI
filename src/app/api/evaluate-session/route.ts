import { NextResponse } from "next/server";
import { evaluateSession } from "@/lib/evaluation/evaluateSession";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionLog, context } = body;

    if (!sessionLog || !Array.isArray(sessionLog.events) || !Array.isArray(sessionLog.commands)) {
      return NextResponse.json(
        { error: "Invalid request: sessionLog with events and commands arrays is required." },
        { status: 400 },
      );
    }

    const result = await evaluateSession({ sessionLog, context: context ?? {} });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
