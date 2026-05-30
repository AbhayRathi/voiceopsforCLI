import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { evaluateLocal } from "./localEvaluator";
import { buildCekuraPayload } from "./cekuraPayload";
import { evaluateWithCekura } from "./cekuraEvaluator";
import { evaluateSession } from "./evaluateSession";
import { SessionEvent, CommandExecution } from "../types";

const mockEvents: SessionEvent[] = [
  { id: "1", timestamp: "10:00:00", type: "user_utterance", detail: "Check if this repo is safe to push" },
  { id: "2", timestamp: "10:00:01", type: "intent_detected", detail: "Intent: Pre-push check" },
  { id: "3", timestamp: "10:00:02", type: "command_executed", detail: "git status: executed in 50ms" },
  { id: "4", timestamp: "10:00:03", type: "agent_response", detail: "Running pre-push checks..." },
  { id: "5", timestamp: "10:00:04", type: "command_blocked", detail: "git push: blocked" },
];

const mockCommands: CommandExecution[] = [
  {
    id: "git_status",
    command: "git status",
    purpose: "Check working tree",
    riskLevel: "low",
    status: "allowed",
    reason: "allowlisted",
    stdout: "",
    stderr: "",
    output: "On branch main\nnothing to commit",
    exitCode: 0,
    durationMs: 50,
    executed: true,
    usedMock: false,
  },
  {
    id: "tests",
    command: "npm test",
    purpose: "Run tests",
    riskLevel: "low",
    status: "allowed",
    reason: "allowlisted",
    stdout: "",
    stderr: "",
    output: "1 failing test",
    exitCode: 1,
    durationMs: 200,
    executed: true,
    usedMock: false,
  },
  {
    id: "push_blocked",
    command: "git push",
    purpose: "Push to remote",
    riskLevel: "high",
    status: "blocked",
    reason: "blocked by policy",
    stdout: "",
    stderr: "",
    output: "",
    exitCode: null,
    durationMs: 0,
    executed: false,
    usedMock: false,
  },
];

describe("localEvaluator", () => {
  it("returns EvaluationResult with provider local", () => {
    const result = evaluateLocal({
      events: mockEvents,
      commands: mockCommands,
      intents: ["pre_push_check", "risky_commit_push"],
      latestTestOutput: "1 failing test",
    });

    expect(result.provider).toBe("local");
    expect(result.connected).toBe(true);
    expect(result.fallbackUsed).toBe(false);
    expect(typeof result.score).toBe("number");
    expect(result.categories.length).toBeGreaterThan(0);
    expect(Array.isArray(result.failures)).toBe(true);
    expect(Array.isArray(result.learnedGuardrails)).toBe(true);
    expect(typeof result.summary).toBe("string");
  });

  it("includes learned guardrails when tests fail", () => {
    const result = evaluateLocal({
      events: mockEvents,
      commands: mockCommands,
      intents: ["pre_push_check"],
    });

    expect(result.learnedGuardrails.length).toBeGreaterThan(0);
    expect(result.learnedGuardrails.some((g) => g.includes("tests fail"))).toBe(true);
  });
});

describe("cekuraPayload", () => {
  it("includes all required fields", () => {
    const payload = buildCekuraPayload(
      { events: mockEvents, commands: mockCommands },
      { targetRepo: "/tmp/repo", demoMode: true, readinessScore: 72 },
    );

    expect(payload.agent_name).toBe("VoiceOps Guard");
    expect(payload.scenario_id).toBe("repo_pre_push_safety");
    expect(payload.scenario_name).toBe("Repo pre-push safety");
    expect(payload.target_repo).toBe("/tmp/repo");
    expect(payload.demo_mode).toBe(true);
    expect(Array.isArray(payload.transcript)).toBe(true);
    expect(payload.transcript.length).toBeGreaterThan(0);
    expect(payload.expected_behaviors.length).toBe(6);
    expect(payload.rubric.length).toBe(5);
    expect(payload.session_artifacts.commands_proposed).toBe(3);
    expect(payload.session_artifacts.commands_executed).toBe(2);
    expect(payload.session_artifacts.commands_blocked).toBe(1);
    expect(payload.session_artifacts.readiness_score).toBe(72);
  });

  it("maps events to correct transcript roles", () => {
    const payload = buildCekuraPayload(
      { events: mockEvents, commands: mockCommands },
      {},
    );

    const roles = payload.transcript.map((t) => t.role);
    expect(roles).toContain("user");
    expect(roles).toContain("assistant");
    expect(roles).toContain("tool");
    expect(roles).toContain("system");
  });
});

describe("evaluateWithCekura", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("throws when config is missing", async () => {
    process.env.CEKURA_API_KEY = "";
    process.env.CEKURA_BASE_URL = "";

    await expect(
      evaluateWithCekura(
        { events: mockEvents, commands: mockCommands },
        {},
        { events: mockEvents, commands: mockCommands, intents: ["pre_push_check"] },
      ),
    ).rejects.toThrow("Cekura configuration missing");
  });

  it("handles fetch failure without crashing", async () => {
    process.env.CEKURA_API_KEY = "test-key";
    process.env.CEKURA_BASE_URL = "http://localhost:9999";

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Connection refused")));

    await expect(
      evaluateWithCekura(
        { events: mockEvents, commands: mockCommands },
        {},
        { events: mockEvents, commands: mockCommands, intents: ["pre_push_check"] },
      ),
    ).rejects.toThrow();
  });

  it("handles timeout without crashing", async () => {
    process.env.CEKURA_API_KEY = "test-key";
    process.env.CEKURA_BASE_URL = "http://localhost:9999";

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")));

    await expect(
      evaluateWithCekura(
        { events: mockEvents, commands: mockCommands },
        {},
        { events: mockEvents, commands: mockCommands, intents: ["pre_push_check"] },
      ),
    ).rejects.toThrow();
  });
});

describe("evaluateSession", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("uses local evaluator by default", async () => {
    process.env.EVALUATOR_PROVIDER = "local";

    const result = await evaluateSession({
      sessionLog: { events: mockEvents, commands: mockCommands },
      context: { intents: ["pre_push_check"] },
    });

    expect(result.provider).toBe("local");
    expect(result.connected).toBe(true);
    expect(result.fallbackUsed).toBe(false);
  });

  it("falls back to local when cekura config is missing", async () => {
    process.env.EVALUATOR_PROVIDER = "cekura";
    process.env.CEKURA_API_KEY = "";
    process.env.CEKURA_BASE_URL = "";

    const result = await evaluateSession({
      sessionLog: { events: mockEvents, commands: mockCommands },
      context: { intents: ["pre_push_check"] },
    });

    expect(result.provider).toBe("local");
    expect(result.connected).toBe(false);
    expect(result.fallbackUsed).toBe(true);
    expect(result.summary).toContain("Cekura unavailable");
  });

  it("falls back to local when cekura fetch fails", async () => {
    process.env.EVALUATOR_PROVIDER = "cekura";
    process.env.CEKURA_API_KEY = "test-key";
    process.env.CEKURA_BASE_URL = "http://localhost:9999";

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Connection refused")));

    const result = await evaluateSession({
      sessionLog: { events: mockEvents, commands: mockCommands },
      context: { intents: ["pre_push_check"] },
    });

    expect(result.provider).toBe("local");
    expect(result.connected).toBe(false);
    expect(result.fallbackUsed).toBe(true);
    expect(result.summary).toContain("Cekura unavailable");
  });

  it("returns cekura result on successful response", async () => {
    process.env.EVALUATOR_PROVIDER = "cekura";
    process.env.CEKURA_API_KEY = "test-key";
    process.env.CEKURA_BASE_URL = "http://cekura.test";

    const mockCekuraResponse = {
      score: 85,
      categories: [{ name: "Safety", status: "pass", explanation: "All safe" }],
      failures: [],
      learnedGuardrails: ["Always confirm before push"],
      summary: "Excellent safety posture.",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCekuraResponse),
      }),
    );

    const result = await evaluateSession({
      sessionLog: { events: mockEvents, commands: mockCommands },
      context: { intents: ["pre_push_check"] },
    });

    expect(result.provider).toBe("cekura");
    expect(result.connected).toBe(true);
    expect(result.fallbackUsed).toBe(false);
    expect(result.score).toBe(85);
    expect(result.summary).toBe("Excellent safety posture.");
  });
});
