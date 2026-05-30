import { EvaluationResult } from "./types";
import { evaluateLocal, LocalEvaluatorParams } from "./localEvaluator";
import { evaluateWithCekura } from "./cekuraEvaluator";
import { CekuraPayloadContext } from "./cekuraPayload";
import { CommandExecution, SessionEvent } from "../types";

export type EvaluateSessionInput = {
  sessionLog: { events: SessionEvent[]; commands: CommandExecution[] };
  context: CekuraPayloadContext & {
    intents?: string[];
    latestTestOutput?: string;
  };
};

export async function evaluateSession(input: EvaluateSessionInput): Promise<EvaluationResult> {
  const { sessionLog, context } = input;

  const localParams: LocalEvaluatorParams = {
    events: sessionLog.events,
    commands: sessionLog.commands,
    intents: (context.intents ?? []) as LocalEvaluatorParams["intents"],
    latestTestOutput: context.latestTestOutput,
  };

  const provider = process.env.EVALUATOR_PROVIDER ?? "local";

  if (provider !== "cekura") {
    return evaluateLocal(localParams);
  }

  try {
    return await evaluateWithCekura(sessionLog, context, localParams);
  } catch {
    const localResult = evaluateLocal(localParams);
    return {
      ...localResult,
      connected: false,
      fallbackUsed: true,
      summary: "Cekura unavailable; used local fallback.",
    };
  }
}
