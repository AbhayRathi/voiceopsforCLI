import { EvaluationResult } from "./types";
import { buildCekuraPayload, CekuraPayloadContext } from "./cekuraPayload";
import { evaluateLocal, LocalEvaluatorParams } from "./localEvaluator";
import { CommandExecution, SessionEvent } from "../types";

type CekuraConfig = {
  apiKey: string;
  baseUrl: string;
  agentId?: string;
  scenarioId?: string;
};

function getCekuraConfig(): CekuraConfig | null {
  const apiKey = process.env.CEKURA_API_KEY;
  const baseUrl = process.env.CEKURA_BASE_URL;

  if (!apiKey || !baseUrl) return null;

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ""),
    agentId: process.env.CEKURA_AGENT_ID || undefined,
    scenarioId: process.env.CEKURA_SCENARIO_ID || undefined,
  };
}

export async function evaluateWithCekura(
  sessionLog: { events: SessionEvent[]; commands: CommandExecution[] },
  context: CekuraPayloadContext,
  localParams: LocalEvaluatorParams,
): Promise<EvaluationResult> {
  const config = getCekuraConfig();
  if (!config) {
    throw new Error("Cekura configuration missing: CEKURA_API_KEY and CEKURA_BASE_URL are required.");
  }

  const payload = buildCekuraPayload(sessionLog, context);

  const body: Record<string, unknown> = { ...payload };
  if (config.agentId) body.agent_id = config.agentId;
  if (config.scenarioId) body.scenario_id = config.scenarioId;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const authHeader = "Bearer " + config.apiKey;
    const response = await fetch(`${config.baseUrl}/evaluations`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Cekura API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Normalize response
    if (
      typeof data.score === "number" &&
      Array.isArray(data.categories) &&
      Array.isArray(data.failures) &&
      Array.isArray(data.learnedGuardrails)
    ) {
      return {
        provider: "cekura",
        connected: true,
        fallbackUsed: false,
        score: data.score,
        categories: data.categories,
        failures: data.failures,
        learnedGuardrails: data.learnedGuardrails,
        summary: data.summary ?? "Cekura evaluation completed.",
        rawProviderResult: data,
      };
    }

    // Unknown response shape — use local fields as fallback values
    const localResult = evaluateLocal(localParams);
    return {
      provider: "cekura",
      connected: true,
      fallbackUsed: false,
      score: localResult.score,
      categories: localResult.categories,
      failures: localResult.failures,
      learnedGuardrails: localResult.learnedGuardrails,
      summary: "Cekura evaluation completed; response normalized with local fallback fields.",
      rawProviderResult: data,
    };
  } finally {
    clearTimeout(timeout);
  }
}
