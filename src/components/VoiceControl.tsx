"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSpeechRecognition } from "@/lib/speech";

type Props = {
  onSubmitUtterance: (text: string) => void;
  onSubmitPreset: (text: string) => void;
  finalText: string;
  voiceOn: boolean;
  onToggleVoice: () => void;
  isRunning: boolean;
  onRecordingStateChange?: (recording: boolean) => void;
};

const presets = [
  "Check if this repo is safe to push.",
  "Explain the test failure.",
  "Check for security issues.",
  "Commit everything and push.",
  "Delete all old logs.",
  "Clean everything up.",
];

export default function VoiceControl({ onSubmitUtterance, onSubmitPreset, finalText, voiceOn, onToggleVoice, isRunning, onRecordingStateChange }: Props) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [recording, setRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  const supportsVoice = useMemo(() => Boolean(getSpeechRecognition()), []);

  useEffect(() => {
    const RecognitionCtor = getSpeechRecognition();
    if (!RecognitionCtor) return;

    const recognition = new RecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result.length > 0 ? (result[0]?.transcript ?? "") : "";
        if (result.isFinal) final += transcript;
        else interim += transcript;
      }
      setLiveTranscript(interim || final);
      if (final.trim()) onSubmitUtterance(final.trim());
    };

    recognition.onend = () => {
      setRecording(false);
      onRecordingStateChange?.(false);
    };
    recognition.onerror = () => {
      setRecording(false);
      onRecordingStateChange?.(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [onSubmitUtterance, onRecordingStateChange]);

  const buttonLabel = useMemo(() => {
    if (!supportsVoice) return "Voice unavailable";
    return recording ? "Stop recording" : "Push to talk";
  }, [recording, supportsVoice]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
      onRecordingStateChange?.(false);
      return;
    }
    setLiveTranscript("");
    setRecording(true);
    onRecordingStateChange?.(true);
    recognitionRef.current.start();
  };

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
      <h2 className="text-lg font-semibold">Voice control panel</h2>
      <p className="mt-1 text-sm text-slate-300">Live voice mode + fallback preset utterances.</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isRunning || !supportsVoice}
          onClick={toggleRecording}
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-600"
        >
          {isRunning ? (
            <>
              Running checks…
              <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </>
          ) : buttonLabel}
        </button>
        <button
          type="button"
          onClick={onToggleVoice}
          className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-100"
        >
          Agent voice: {voiceOn ? "On" : "Off"}
        </button>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <p>
          <span className="font-medium text-slate-200">Recording state:</span>{" "}
          <span className={recording ? "text-emerald-300" : "text-slate-400"}>{recording ? "Listening" : "Idle"}</span>
        </p>
        <p>
          <span className="font-medium text-slate-200">Live transcript:</span> <span className="text-slate-300">{liveTranscript || "—"}</span>
        </p>
        <p>
          <span className="font-medium text-slate-200">Final recognized text:</span> <span className="text-slate-300">{finalText || "—"}</span>
        </p>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-slate-200">Demo fallback presets</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              type="button"
              key={preset}
              disabled={isRunning}
              onClick={() => onSubmitPreset(preset)}
              className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-100 hover:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
