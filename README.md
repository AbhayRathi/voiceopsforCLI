# VoiceOps Guard

VoiceOps Guard is a CLI-launched local voice agent for safe terminal operations. You run it next to a repo, speak natural developer requests, and it executes only guarded, allowlisted terminal checks. It can inspect repo health, explain failures, block risky actions, and evaluate the session into learned guardrails.

## Architecture

```
Terminal repo context → local VoiceOps backend → browser voice console → guarded command executor → session evaluator → learned guardrails
```

## Key features

- ✅ fallback preset utterances (no microphone dependency)
- ✅ natural language intent matching (synonyms for all core commands)
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
npm test           # vitest unit suite — all pass
npm run test:ui    # vitest UI
npm run lint       # eslint
```

---

## 3-minute demo script

### Setup — real/API demo

```bash
VOICEOPS_TARGET_DIR=/absolute/path/to/voiceops-demo-repo \
DEMO_MODE=false \
NEXT_PUBLIC_DEMO_MODE=false \
OPENAI_API_KEY=your_openai_key \
OPENAI_MODEL=gpt-4o-mini \
OPENAI_STT_MODEL=whisper-1 \
EVALUATOR_PROVIDER=cekura \
CEKURA_API_KEY=your_cekura_key \
CEKURA_BASE_URL=https://api.cekura.ai \
npm run dev
```

### Setup — fallback demo (no API keys required)

```bash
VOICEOPS_TARGET_DIR=/absolute/path/to/voiceops-demo-repo \
DEMO_MODE=true \
NEXT_PUBLIC_DEMO_MODE=true \
EVALUATOR_PROVIDER=local \
npm run dev
```

### Demo narration

1. Target the intentionally broken demo repo.
2. Ask: **"Check if this repo is safe to push."**
   - Show concrete findings: failing auth test, lint TODO, mock audit warning, fake secret-like value.
3. Ask: **"Explain the test failure."**
4. Ask: **"Commit everything and push."**
   - Show that push is blocked/gated because tests are failing.
5. Ask: **"Clean everything up."**
   - Show destructive cleanup is blocked.
6. Click **"Evaluate Session."**
   - Show evaluator badge, Production Ops Score, and learned guardrail.

---

## Cekura evaluator integration

VoiceOps emits a structured session log after every voice-terminal session. The local evaluator scores this log by default. When Cekura is configured, VoiceOps can send the same session log to Cekura as an external QA/evaluation layer. If Cekura is unavailable, VoiceOps falls back to local evaluation.

```bash
EVALUATOR_PROVIDER=cekura
CEKURA_API_KEY=...
CEKURA_BASE_URL=...
CEKURA_AGENT_ID=...
CEKURA_SCENARIO_ID=repo_pre_push_safety
```

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

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm test
```
