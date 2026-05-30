# VoiceOps Guard

VoiceOps Guard is a live **voice-controlled terminal safety agent** for repo health checks and push readiness.

It is designed for deterministic hackathon demos:
- ✅ fallback preset utterances (no microphone dependency)
- ✅ guarded command execution with allowlist + risk classifier
- ✅ blocked risky operations (including `git push`)
- ✅ pre-push readiness scoring
- ✅ post-session evaluation + learned guardrails
- ✅ optional browser speech recognition and text-to-speech
- ✅ optional OpenAI integration (transcription + AI planning) — gracefully degraded

## Tech stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS v4
- Backend API route for guarded command execution (`/api/execute-command`)

## Quick start (demo mode — no API keys required)

```bash
cp .env.example .env.local   # enables demo mode + sets NEXT_PUBLIC_DEMO_MODE
npm install
npm run dev
# Open http://localhost:3000
```

## Quick start (with LLM — real transcription + AI planning)

```bash
cp .env.example .env.local
# Edit .env.local:
#   DEMO_MODE=false
#   NEXT_PUBLIC_DEMO_MODE=false
#   OPENAI_API_KEY=sk-...
npm install
npm run dev
```

## Running tests

```bash
npm test           # vitest unit suite (5 tests — all pass)
npm run test:ui    # vitest UI
npm run lint       # eslint
```

## Demo flow (recommended)

Use fallback preset buttons in this order:
1. **Check if this repo is safe to push.**
2. **Explain the test failure.**
3. **Commit everything and push.**
4. Click **Evaluate Session**.
5. **Clean everything up.**

## Voice mode

In Chrome, you can use push-to-talk speech recognition if browser permission is granted.

If voice input fails (permissions/noise), use preset utterances. The behavior is identical.

## Safety model

The app classifies commands into:
- `low` → allowlisted safe diagnostics (auto-run)
- `medium` → requires confirmation
- `high/critical` → blocked (or effectively blocked for MVP)

Key constraints:
- `git push` is never executed in this MVP
- destructive filesystem commands are blocked from voice input
- commands not on the allowlist are blocked
- all command execution is server-side with timeout and restricted cwd

## Mock fallback mode

To keep the demo reliable, command outputs can fall back to deterministic mock outputs when local scripts/tools are unavailable.

This ensures the UI still demonstrates:
- changed files
- failing test explanation
- lint/audit caveats
- secret scan status

## Optional environment variables

See `.env.example` for the full list. Key variables:

- `DEMO_MODE` / `NEXT_PUBLIC_DEMO_MODE` — set to `true` for hackathon demo
- `OPENAI_API_KEY` — enables real transcription and AI planning
- `VOICEOPS_TARGET_DIR` — target repo directory for safe command execution

No LLM key is required for core functionality. `npm install` picks up all dependencies including the optional OpenAI SDK.

## Demo against voiceops-demo-repo

```bash
# Real mode (requires OpenAI API key and voiceops-demo-repo cloned locally)
VOICEOPS_TARGET_DIR=/absolute/path/to/voiceops-demo-repo \
DEMO_MODE=false \
NEXT_PUBLIC_DEMO_MODE=false \
OPENAI_API_KEY=your_key_here \
npm run dev
```

```bash
# Fallback demo mode (no API key required)
VOICEOPS_TARGET_DIR=/absolute/path/to/voiceops-demo-repo \
DEMO_MODE=true \
NEXT_PUBLIC_DEMO_MODE=true \
npm run dev
```

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm test
```
