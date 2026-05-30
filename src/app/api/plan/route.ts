import { NextRequest, NextResponse } from "next/server";
import { detectIntent } from "@/lib/intents";
import { generateFallbackSummary } from "@/lib/fallbackAgent";

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { utterance?: string };
  const utterance = body.utterance?.trim();

  if (!utterance) {
    return NextResponse.json({ error: "Utterance is required." }, { status: 400 });
  }

  const intent = detectIntent(utterance);

  // Guard: demo mode or missing API key → return fallback summary
  if (isDemoMode() || !process.env.OPENAI_API_KEY) {
    const summary = generateFallbackSummary(intent);
    return NextResponse.json({
      intent,
      ...summary,
      fallback: !process.env.OPENAI_API_KEY && !isDemoMode(),
    });
  }

  // Real OpenAI planning
  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are VoiceOps Guard, an AI assistant that helps developers safely manage their repository. Given the user's intent, provide a concise plan with steps to execute. Respond in JSON with fields: summary (string), spokenSummary (string), steps (array of {id, title, command, purpose}).",
        },
        {
          role: "user",
          content: `Intent: ${intent}\nUtterance: ${utterance}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from OpenAI");

    const parsed = JSON.parse(content) as {
      summary: string;
      spokenSummary: string;
      steps?: Array<{ id: string; title: string; command: string; purpose: string }>;
    };

    return NextResponse.json({
      intent,
      ...parsed,
      fallback: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown planning error";
    console.error("OpenAI planning error, falling back:", message);

    const summary = generateFallbackSummary(intent);
    return NextResponse.json({
      intent,
      ...summary,
      fallback: true,
      error: "⚠ LLM unavailable — using deterministic fallback",
    });
  }
}
