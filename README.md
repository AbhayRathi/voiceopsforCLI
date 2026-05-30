# VoiceOps Guard

VoiceOps Guard is a live **voice-controlled terminal safety agent** for repo health checks and push readiness.

It is designed for deterministic hackathon demos:
- ✅ fallback preset utterances (no microphone dependency)
- ✅ guarded command execution with allowlist + risk classifier
- ✅ blocked risky operations (including `git push`)
- ✅ pre-push readiness scoring
- ✅ post-session evaluation + learned guardrails
- ✅ optional browser speech recognition and text-to-speech

## Tech stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS v4
- Backend API route for guarded command execution (`/api/execute-command`)

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

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

- `VOICEOPS_TARGET_DIR` (optional): target repo directory for safe command execution. Defaults to the current app working directory.

No LLM key is required for core functionality.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```
