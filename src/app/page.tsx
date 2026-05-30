"use client";

import { useMemo, useState } from "react";
import AgentPlan from "@/components/AgentPlan";
import CommandExecutionPanel from "@/components/CommandExecutionPanel";
import EvaluationPanel from "@/components/EvaluationPanel";
import ReadinessReport from "@/components/ReadinessReport";
import SafetyPanel from "@/components/SafetyPanel";
import SessionTimeline from "@/components/SessionTimeline";
import TerminalOutput from "@/components/TerminalOutput";
import VoiceControl from "@/components/VoiceControl";
import { buildPlan, summarizeReadiness } from "@/lib/commands";
import { evaluateSession } from "@/lib/evaluator";
import { mergeGuardrails } from "@/lib/guardrails";
import { detectIntent, intentLabel } from "@/lib/intents";
import { applyMockFallback } from "@/lib/mockData";
import { baseSafetyPolicy } from "@/lib/safety";
import { speakText } from "@/lib/speech";
import { CommandExecution, EvaluationResult, Intent, PlanStep, ReadinessReport as ReadinessReportType, SessionEvent } from "@/lib/types";

const pushProposal = ["git add .", "git commit -m \"...\"", "git push"];
const MAX_EXPLAIN_LINES = 3;

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

  const activePolicy = useMemo(() => mergeGuardrails(baseSafetyPolicy, guardrails), [guardrails]);

  const addEvent = (type: SessionEvent["type"], detail: string) => {
    setEvents((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: now(),
        type,
        detail,
      },
    ]);
  };

  const speakReply = (text: string) => {
    setAgentReply(text);
    speakText(text, voiceOn);
    addEvent("agent_response", text);
  };

  const runPlan = async (steps: PlanStep[]) => {
    const localResults: CommandExecution[] = [];

    for (const step of steps) {
      addEvent("command_proposed", `${step.command} — ${step.purpose}`);
      setTerminalLines((current) => [...current, `$ ${step.command}`]);

      const response = await fetch("/api/execute-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: step.command, purpose: step.purpose }),
      });
      const data = (await response.json()) as Omit<CommandExecution, "id">;

      const commandResult = applyMockFallback({ ...data, id: step.id });
      localResults.push(commandResult);

      setTerminalLines((current) => [...current, commandResult.output]);
      addEvent(commandResult.status === "blocked" ? "command_blocked" : "command_result", `${step.command}: ${commandResult.status}`);
    }

    setCommands(localResults);
    return localResults;
  };

  const explainLatestFailure = () => {
    const testRun = commands.find((command) => command.id === "tests");

    if (!testRun?.output) {
      speakReply("I do not have a recent test output to explain yet. Run a pre-push check first.");
      return;
    }

    const explanation = testRun.exitCode === 0
      ? "Tests passed in the latest run, so there is no failure to explain."
      : `The test run failed. In plain English: ${testRun.output.split("\n").slice(0, MAX_EXPLAIN_LINES).join(" ")}. Likely fix: inspect the failing assertion, update expected behavior, and rerun tests.`;

    speakReply(explanation);
  };

  const handleUtterance = async (utterance: string) => {
    const trimmed = utterance.trim();
    if (!trimmed) return;

    setFinalText(trimmed);
    addEvent("user_utterance", trimmed);

    const intent = detectIntent(trimmed);
    setDetectedIntent(intent);
    setIntentHistory((current) => [...current, intent]);

    if (intent === "pre_push_check" || intent === "security_check") {
      const { explanation, steps } = buildPlan(intent);
      setPlanExplanation(explanation);
      setPlanSteps(steps);
      speakReply(explanation);
      const runResults = await runPlan(steps);

      if (intent === "pre_push_check") {
        const report = summarizeReadiness(runResults);
        setReadiness(report);
        speakReply(`Push Readiness Score: ${report.score}/100. ${report.recommendation}`);
      } else {
        speakReply("Security check complete. Review dependency audit and secret scan output.");
      }
      return;
    }

    if (intent === "explain_test_failure") {
      setPlanExplanation("I will explain the latest test output in plain English and suggest a likely fix.");
      setPlanSteps([]);
      explainLatestFailure();
      return;
    }

    if (intent === "risky_commit_push") {
      setPlanExplanation("This is a risky state-changing request. I will require explicit confirmation and will not run git push in this MVP.");
      setPlanSteps([]);
      const testsFailed = commands.some((command) => command.id === "tests" && (command.exitCode ?? 0) !== 0);
      const reply = testsFailed
        ? `Committing and pushing changes repository state and may publish broken code. Tests are currently failing, so I do not recommend pushing. I can draft commands, but I need explicit confirmation. Proposed commands: ${pushProposal.join(", ")}.`
        : `Committing and pushing is high risk. I can draft commands, but explicit confirmation is required. Proposed commands: ${pushProposal.join(", ")}.`;
      setLatestRiskDecision("Risk: High. Reason: state-changing operation with potential broken code publication. Action: requires explicit confirmation. git push remains blocked.");
      speakReply(reply);
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
      setLatestRiskDecision("Risk: Critical. Reason: ambiguous destructive request. Action: blocked deletion and offered safe preview.");
      speakReply("That request is ambiguous and may be destructive. Do you mean logs, cache, dependencies, or build artifacts? I can list candidates first, but I will not delete anything without explicit confirmation.");
      return;
    }

    setPlanExplanation("Intent unclear. Ask a concise clarification question.");
    setPlanSteps([]);
    speakReply("Can you clarify what you want me to check? For example: safe to push, security check, or explain test failure.");
  };

  const evaluate = () => {
    const result = evaluateSession({
      events,
      commands,
      intents: intentHistory,
      latestTestOutput: commands.find((command) => command.id === "tests")?.output,
    });
    setEvaluation(result);
    addEvent("evaluation", `Production Ops Score ${result.productionOpsScore}/100`);

    if (result.learnedGuardrails.length) {
      setGuardrails((current) => mergeGuardrails(current, result.learnedGuardrails));
      result.learnedGuardrails.forEach((guardrail) => addEvent("guardrail_added", guardrail));
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <header className="mx-auto mb-6 max-w-7xl rounded-xl border border-slate-700 bg-slate-900/70 p-5 shadow-xl">
        <h1 className="text-3xl font-bold">VoiceOps Guard</h1>
        <p className="mt-1 text-slate-300">Live voice-controlled terminal agent with safety gates and post-session evaluation</p>
        <p className="mt-2 text-sm text-cyan-300">Speak → Plan → Guard → Execute → Explain → Evaluate → Improve</p>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-2">
        <VoiceControl
          onSubmitUtterance={handleUtterance}
          finalText={finalText}
          voiceOn={voiceOn}
          onToggleVoice={() => setVoiceOn((current) => !current)}
        />
        <AgentPlan intent={intentLabel(detectedIntent)} explanation={planExplanation} steps={planSteps} />

        <CommandExecutionPanel commands={commands} />
        <TerminalOutput lines={terminalLines} />

        <ReadinessReport report={readiness} />
        <SafetyPanel
          policy={activePolicy}
          learnedGuardrails={guardrails}
          latestRiskDecision={latestRiskDecision}
          commands={commands}
        />

        <EvaluationPanel evaluation={evaluation} onEvaluate={evaluate} />
        <SessionTimeline events={events} />
      </div>

      <footer className="mx-auto mt-6 max-w-7xl rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-300">
        <span className="font-medium text-slate-100">Latest agent response:</span> {agentReply}
      </footer>
    </main>
  );
}
