import { NextRequest, NextResponse } from "next/server";

const MOCK_TRANSCRIPTS: Record<string, string> = {
  default: "Check if this repo is safe to push.",
};

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export async function POST(request: NextRequest) {
  // Guard: demo mode or missing API key → return mock transcript
  if (isDemoMode() || !process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      transcript: MOCK_TRANSCRIPTS.default,
      fallback: !process.env.OPENAI_API_KEY && !isDemoMode(),
    });
  }

  // Real OpenAI transcription
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const model = process.env.OPENAI_STT_MODEL ?? "whisper-1";
    const file = new File([audioFile], "audio.webm", { type: audioFile.type || "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      model,
      file,
    });

    return NextResponse.json({
      transcript: transcription.text,
      fallback: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown transcription error";
    console.error("OpenAI transcription error, falling back to mock:", message);

    return NextResponse.json({
      transcript: MOCK_TRANSCRIPTS.default,
      fallback: true,
      error: "⚠ LLM unavailable — using deterministic fallback",
    });
  }
}
