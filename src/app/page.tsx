"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AgentPlan from "@/components/AgentPlan";
import CollapsibleSection from "@/components/CollapsibleSection";
import CommandExecutionPanel from "@/components/CommandExecutionPanel";
import ConfirmationGate from "@/components/ConfirmationGate";
import DemoModeBadge from "@/components/DemoModeBadge";
import EvaluationPanel from "@/components/EvaluationPanel";
import LatencyBadges from "@/components/LatencyBadges";
import ReadinessReport from "@/components/ReadinessReport";
import SafetyPanel from "@/components/SafetyPanel";
import SafetyPolicyPanel from "@/components/SafetyPolicyPanel";
import SessionTimeline from "@/components/SessionTimeline";
import StatusTimeline from "@/components/StatusTimeline";
import TerminalOutput from "@/components/TerminalOutput";
import VoiceControl from "@/components/VoiceControl";
import { buildPlan, summarizeReadiness } from "@/lib/commands";
import { evaluateSession as evaluateSessionLocal } from "@/lib/evaluator";
import { getFallbackResponse, getEvaluationSpokenSummary, getReadinessSpokenSummary } from "@/lib/fallbackAgent";
import { mergeGuardrails } from "@/lib/guardrails";
import { detectIntent, intentLabel } from "@/lib/intents";
import { elapsed, emptyLatency, startTimer } from "@/lib/latency";
import { applyMockFallback } from "@/lib/mockData";
import { baseSafetyPolicy } from "@/lib/safety";
import { speakText } from "@/lib/speech";
import {
  CommandExecution,
  Intent,
  LatencyMetrics,
  PendingConfirmation,
  PlanStep,
  ReadinessReport as ReadinessReportType,
  SessionEvent,
  WorkflowStatus,
} from "@/lib/types";
import { EvaluationResult } from "@/lib/evaluation/types";

const pushProposal = ["git add .", "git commit -m \"...\"", "git push"];
const MAX_EXPLAIN_LINES = 3;
const MAX_TERMINAL_LINES = 300;
const MAX_OUTPUT_LINES_PER_CMD = 40;

function now(): string {
  return new Date().toLocaleTimeString();
}

export default function Home() {
  const [finalText, setFinalText] = useState("");
  const [detectedIntent, setDetectedIntent] = useState<Intent>("unknown");
  const [planExplanation, setPlanExplanation] = useState("");
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [commands, setCommands] = useState<CommandExecution[]>([]);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [readiness, setReadiness] = useState<ReadinessReportType | null>(null);
  const [agentReply, setAgentReply] = useState("Ready. Ask me to check if this repo is safe to push.");
  const [voiceOn, setVoiceOn] = useState(true);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [guardrails, setGuardrails] = useState<string[]>([]);
  const [latestRiskDecision, setLatestRiskDecision] = useState("");
  const [intentHistory, setIntentHistory] = useState<Intent[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Feature 1: Workflow status
  const [currentStatus, setCurrentStatus] = useState<WorkflowStatus>("idle");
  const [statusHistory, setStatusHistory] = useState<WorkflowStatus[]>([]);

  // Feature 3: Typed confirmation gate
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const confirmCallbackRef = useRef<(() => void) | null>(null);

  // Feature 5: Repo root + demo mode (fetched from server)
  const [repoRoot, setRepoRoot] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  // Feature 10: Latency metrics
  const [latencyMetrics, setLatencyMetrics] = useState<LatencyMetrics>(emptyLatency());
  const sessionStartRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number | null>(null);

  const activePolicy = useMemo(() => mergeGuardrails(baseSafetyPolicy, guardrails), [guardrails]);

  // Fetch repo info on mount
  useEffect(() => {
    fetch("/api/repo-info")
      .then((res) => res.json())
      .then((data: { repoRoot: string | null; demoMode: boolean }) => {
        setRepoRoot(data.repoRoot);
        setDemoMode(data.demoMode);
      })
      .catch(() => {
        // Non-fatal: repo info unavailable
      });
  }, []);

  const advanceStatus = useCallback((status: WorkflowStatus) => {
    setCurrentStatus(status);
    setStatusHistory((prev) => (prev.includes(status) ? prev : [...prev, status]));
  }, []);

  const addEvent = useCallback((type: SessionEvent["type"], detail: string, metadata?: Record<string, unknown>) => {
    setEvents((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: now(),
        type,
        detail,
        metadata,
      },
    ]);
  }, []);

  const speakReply = useCallback((text: string) => {
    setAgentReply(text);
    speakText(text, voiceOn);
    addEvent("agent_response", text);
  }, [voiceOn, addEvent]);

  const runPlan = async (steps: PlanStep[], planStart: number): Promise<CommandExecution[]> => {
    setIsRunning(true);
    const localResults: CommandExecution[] = [];
    const execStart = startTimer();

    try {
      for (const step of steps) {
        const isSecretScan = step.command === "secret_scan_all_files";
        advanceStatus(isSecretScan ? "scanning_secrets" : "running_checks");
        addEvent("command_proposed", `${step.command} — ${step.purpose}`);
        setTerminalLines((current) => [...current, `$ ${step.command}`, ""].slice(-MAX_TERMINAL_LINES));

        try {
          const response = await fetch("/api/execute-command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: step.command, purpose: step.purpose }),
          });
          const data = (await response.json()) as Omit<CommandExecution, "id">;

          const commandResult = applyMockFallback({ ...data, id: step.id });
          localResults.push(commandResult);

          const outputLines = commandResult.output
            .split("\n")
            .slice(0, MAX_OUTPUT_LINES_PER_CMD);
          setTerminalLines((current) => [...current, ...outputLines, ""].slice(-MAX_TERMINAL_LINES));

          if (commandResult.status === "blocked") {
            addEvent("command_blocked", `${step.command}: blocked — ${commandResult.reason}`);
          } else if (commandResult.status === "requires_confirmation") {
            addEvent("confirmation_required", `${step.command}: requires confirmation`);
          } else {
            addEvent("command_executed", `${step.command}: executed in ${commandResult.durationMs}ms`);
            addEvent("command_result", `${step.command}: exit ${commandResult.exitCode ?? "n/a"}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          setTerminalLines((current) => [...current, `Error: ${message}`, ""].slice(-MAX_TERMINAL_LINES));
          addEvent("error", `${step.command}: ${message}`);
        }
      }

      setCommands(localResults);
      setLatencyMetrics((prev) => ({ ...prev, executionMs: elapsed(execStart), planningMs: elapsed(planStart) }));
      return localResults;
    } finally {
      setIsRunning(false);
    }
  };

  const explainLatestFailure = () => {
    const testRun = commands.find((command) => command.id === "tests");

    if (!testRun?.output) {
      speakReply("I do not have a recent test output to explain yet. Run a pre-push check first.");
      return;
    }

    const explanation =
      testRun.exitCode === 0
        ? "Tests passed in the latest run, so there is no failure to explain."
        : `The test run failed. In plain English: ${testRun.output.split("\n").slice(0, MAX_EXPLAIN_LINES).join(" ")}. Likely fix: inspect the failing assertion, update expected behavior, and rerun tests.`;

    addEvent("report_generated", "Test failure explanation generated");
    speakReply(explanation);
  };

  const handleUtterance = async (utterance: string, isPreset = false) => {
    const trimmed = utterance.trim();
    if (!trimmed) return;

    // Track session start
    if (!sessionStartRef.current) sessionStartRef.current = startTimer();

    // Reset status for new flow
    setStatusHistory([]);
    advanceStatus("transcribed");

    const transcriptionMs = isPreset ? null : (recordingStartRef.current ? Date.now() - recordingStartRef.current : null);
    recordingStartRef.current = null;
    setLatencyMetrics({ ...emptyLatency(), transcriptionMs, isPreset });

    setFinalText(trimmed);
    addEvent("user_utterance", trimmed);
    addEvent("transcript_finalized", trimmed);

    advanceStatus("classifying");
    const intent = detectIntent(trimmed);
    setDetectedIntent(intent);
    setIntentHistory((current) => [...current, intent]);
    addEvent("intent_detected", `Intent: ${intentLabel(intent)}`);

    const planStart = startTimer();
    advanceStatus("planning");

    if (intent === "pre_push_check" || intent === "security_check") {
      const { explanation, steps } = buildPlan(intent);
      setPlanExplanation(explanation);
      setPlanSteps(steps);
      addEvent("plan_created", `${steps.length} steps planned`);
      speakReply(getFallbackResponse(intent).spokenSummary);

      advanceStatus("running_checks");
      const runResults = await runPlan(steps, planStart);

      if (intent === "pre_push_check") {
        advanceStatus("generating_report");
        const report = summarizeReadiness(runResults);
        setReadiness(report);
        addEvent("report_generated", `Score ${report.score}/100 — ${report.recommendation}`);

        const testsFailed = runResults.some((r) => r.id === "tests" && (r.exitCode ?? 0) !== 0);
        const secretWarning = runResults.some(
          (r) => r.id === "secret_scan" && !r.output.toLowerCase().includes("no obvious secrets"),
        );
        const spokenSummary = getReadinessSpokenSummary(report.score, report.blockers.length > 0, testsFailed, secretWarning);
        speakReply(spokenSummary);
      } else {
        speakReply("Security check complete. Review dependency audit and secret scan output.");
      }

      advanceStatus("complete");
      setLatencyMetrics((prev) => ({ ...prev, totalMs: sessionStartRef.current ? elapsed(sessionStartRef.current) : null }));
      return;
    }

    if (intent === "explain_test_failure") {
      setPlanExplanation("I will explain the latest test output in plain English and suggest a likely fix.");
      setPlanSteps([]);
      addEvent("plan_created", "Explanation plan: analyze latest test output");
      explainLatestFailure();
      advanceStatus("complete");
      return;
    }

    if (intent === "risky_commit_push") {
      setPlanExplanation(
        "This is a risky state-changing request. I will require explicit confirmation and will not run git push in this MVP.",
      );
      setPlanSteps([]);
      addEvent("plan_created", "Risky action plan: gate behind typed confirmation");

      const testsFailed = commands.some((command) => command.id === "tests" && (command.exitCode ?? 0) !== 0);
      const reason = testsFailed
        ? "Tests are currently failing. Pushing broken code is risky."
        : "Committing and pushing modifies repository state permanently.";

      setLatestRiskDecision(
        "Risk: High. Reason: state-changing operation with potential broken code publication. Action: requires explicit confirmation. git push remains blocked.",
      );
      addEvent("risk_classified", "Risk: High — risky_commit_push");
      addEvent("confirmation_required", "Typed confirmation required before proceeding");

      speakReply(getFallbackResponse(intent).spokenSummary);

      confirmCallbackRef.current = () => {
        const proposedNote = `Confirmation accepted. Proposed commands: ${pushProposal.join(", ")}. Note: git push remains blocked in this MVP.`;
        addEvent("command_allowed", "Confirmation accepted — commands drafted (push blocked in MVP)");
        speakReply(proposedNote);
        advanceStatus("complete");
      };

      setPendingConfirmation({
        action: "Commit and push",
        phrase: testsFailed ? "CONFIRM COMMIT" : "CONFIRM PUSH",
        reason,
        description: testsFailed
          ? "This repo has failing tests. Committing may publish broken code. git push will remain blocked regardless."
          : "This will stage and commit all changes. git push is blocked in this MVP regardless of confirmation.",
      });

      return;
    }

    if (intent === "cleanup_delete") {
      setPlanExplanation("Cleanup requests can be destructive. I will not delete files directly from voice input.");
      setPlanSteps([
        {
          id: "preview_logs",
          title: "Preview old logs safely",
          command: "find ./logs -type f -mtime +30 -print",
          purpose: "List deletion candidates only",
        },
      ]);
      setLatestRiskDecision(
        "Risk: Critical. Reason: ambiguous destructive request. Action: blocked deletion and offered safe preview.",
      );
      addEvent("risk_classified", "Risk: Critical — cleanup_delete blocked");
      addEvent("command_blocked", "Deletion blocked. Preview-only plan created.");

      confirmCallbackRef.current = () => {
        addEvent("plan_created", "Preview plan confirmed — running find command");
        speakReply("Running a safe preview of old log files. No files will be deleted.");
        runPlan(
          [
            {
              id: "preview_logs",
              title: "Preview old logs safely",
              command: "find ./logs -type f -mtime +30 -print",
              purpose: "List deletion candidates only",
            },
          ],
          planStart,
        ).then(() => advanceStatus("complete"));
      };

      setPendingConfirmation({
        action: "Preview deletion candidates",
        phrase: "CONFIRM DELETE",
        reason: "This request may be destructive. VoiceOps will only list candidates — no files will be deleted.",
        description:
          "Type CONFIRM DELETE to run a safe find command that lists old log files. Nothing will be removed.",
      });

      speakReply(
        "That request is ambiguous and may be destructive. I can list candidates first, but I will not delete anything without explicit confirmation.",
      );
      return;
    }

    setPlanExplanation("Intent unclear. Ask a concise clarification question.");
    setPlanSteps([]);
    speakReply(getFallbackResponse("unknown").spokenSummary);
    advanceStatus("complete");
  };

  const evaluate = async () => {
    const evalStart = startTimer();
    advanceStatus("evaluating");

    try {
      const response = await fetch("/api/evaluate-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionLog: { events, commands },
          context: {
            readinessScore: readiness?.score,
            targetRepo: repoRoot ?? undefined,
            demoMode,
            intents: intentHistory,
            latestTestOutput: commands.find((command) => command.id === "tests")?.output,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Evaluation API failed");
      }

      const result: EvaluationResult = await response.json();
      setEvaluation(result);
      addEvent("evaluation", `Production Ops Score ${result.score}/100`);

      const evalMs = elapsed(evalStart);

      if (result.learnedGuardrails.length) {
        advanceStatus("adding_guardrail");
        setGuardrails((current) => mergeGuardrails(current, result.learnedGuardrails));
        result.learnedGuardrails.forEach((guardrail) => addEvent("guardrail_added", guardrail));
      }

      advanceStatus("complete");
      const spokenSummary = getEvaluationSpokenSummary(result.score, result.learnedGuardrails.length);
      speakReply(spokenSummary);

      setLatencyMetrics((prev) => ({
        ...prev,
        evaluationMs: evalMs,
        totalMs: sessionStartRef.current ? elapsed(sessionStartRef.current) : null,
      }));
    } catch (err) {
      console.error("Evaluation API failed, using local fallback:", err);
      // Fallback to local evaluation if API fails
      const localResult = evaluateSessionLocal({
        events,
        commands,
        intents: intentHistory,
        latestTestOutput: commands.find((command) => command.id === "tests")?.output,
      });

      const result: EvaluationResult = {
        provider: "local",
        connected: true,
        fallbackUsed: false,
        score: localResult.productionOpsScore,
        categories: localResult.categories.map(({ name, status, explanation }) => ({ name, status, explanation })),
        failures: localResult.fails,
        learnedGuardrails: localResult.learnedGuardrails,
        summary: "Local evaluation complete (API unavailable).",
      };

      setEvaluation(result);
      addEvent("evaluation", `Production Ops Score ${result.score}/100`);

      const evalMs = elapsed(evalStart);

      if (result.learnedGuardrails.length) {
        advanceStatus("adding_guardrail");
        setGuardrails((current) => mergeGuardrails(current, result.learnedGuardrails));
        result.learnedGuardrails.forEach((guardrail) => addEvent("guardrail_added", guardrail));
      }

      advanceStatus("complete");
      const spokenSummary = getEvaluationSpokenSummary(result.score, result.learnedGuardrails.length);
      speakReply(spokenSummary);

      setLatencyMetrics((prev) => ({
        ...prev,
        evaluationMs: evalMs,
        totalMs: sessionStartRef.current ? elapsed(sessionStartRef.current) : null,
      }));
    }
  };

  const handleConfirmationConfirm = () => {
    confirmCallbackRef.current?.();
    confirmCallbackRef.current = null;
    setPendingConfirmation(null);
  };

  const handleConfirmationCancel = () => {
    addEvent("agent_response", "Confirmation cancelled by user.");
    confirmCallbackRef.current = null;
    setPendingConfirmation(null);
    speakReply("Cancelled. Let me know if you need anything else.");
    advanceStatus("complete");
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      {/* Confirmation gate modal overlay */}
      <ConfirmationGate
        confirmation={pendingConfirmation}
        onConfirm={handleConfirmationConfirm}
        onCancel={handleConfirmationCancel}
      />

      <header className="mx-auto mb-6 max-w-7xl rounded-xl border border-slate-700 bg-slate-900/70 p-5 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">VoiceOps Guard</h1>
            <p className="mt-1 text-slate-300">
              Live voice-controlled terminal agent with safety gates and post-session evaluation
            </p>
            <p className="mt-2 text-sm text-cyan-300">Speak → Plan → Guard → Execute → Explain → Evaluate → Improve</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {demoMode && <DemoModeBadge />}
            <div className="text-right text-xs text-slate-400">
              {repoRoot ? (
                <>
                  <span className="font-medium text-slate-300">Repo root:</span>{" "}
                  <span className="font-mono text-slate-300">{repoRoot}</span>
                </>
              ) : (
                <span className="text-amber-400">⚠ Repo root not detected — commands run from server cwd</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-4">
        {/* Full-width status timeline */}
        <StatusTimeline currentStatus={currentStatus} statusHistory={statusHistory} />

        {/* Step 1 + 2: Voice input and agent plan */}
        <div className="grid gap-4 lg:grid-cols-2">
          <VoiceControl
            onSubmitUtterance={(text) => handleUtterance(text, false)}
            onSubmitPreset={(text) => handleUtterance(text, true)}
            finalText={finalText}
            voiceOn={voiceOn}
            onToggleVoice={() => setVoiceOn((current) => !current)}
            isRunning={isRunning}
            onRecordingStateChange={(recording) => {
              if (recording) {
                recordingStartRef.current = Date.now();
              }
              advanceStatus(recording ? "listening" : "transcribing");
            }}
          />
          <AgentPlan intent={intentLabel(detectedIntent)} explanation={planExplanation} steps={planSteps} />
        </div>

        {/* Step 3: Command execution results */}
        <CommandExecutionPanel commands={commands} />

        {/* Step 4: Main readiness report — visually dominant */}
        <ReadinessReport report={readiness} />

        {/* Step 4 + 5: Risk decisions and evaluation score */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SafetyPanel
            policy={activePolicy}
            learnedGuardrails={guardrails}
            latestRiskDecision={latestRiskDecision}
            commands={commands}
          />
          <EvaluationPanel evaluation={evaluation} onEvaluate={evaluate} />
        </div>

        {/* Secondary details — collapsed by default to reduce visual noise */}
        <CollapsibleSection title="Terminal Output">
          <TerminalOutput lines={terminalLines} />
        </CollapsibleSection>

        <CollapsibleSection title="Audit Log">
          <SessionTimeline events={events} />
        </CollapsibleSection>

        <CollapsibleSection title="Latency Metrics">
          <LatencyBadges metrics={latencyMetrics} />
        </CollapsibleSection>

        <CollapsibleSection title="Safety Policy Table">
          <SafetyPolicyPanel />
        </CollapsibleSection>
      </div>

      <footer className="mx-auto mt-6 max-w-7xl rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-300">
        <span className="font-medium text-slate-100">Latest agent response:</span> {agentReply}
      </footer>
    </main>
  );
}

