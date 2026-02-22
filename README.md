# discord-coding-agent

A Discord bot that turns a mention into a dedicated thread and uses Groq to help refine software requests into an implementable plan.

Today it is a planning assistant. The long-term goal is to evolve into a coding agent that can open pull requests against a target repo once a plan is approved.

## What It Does (So Far)

- When you mention the bot in a server text channel, it creates (or reuses) a thread for that request.
- Inside the thread, the bot calls Groq Chat Completions to:
  - ask clarifying questions
  - summarize requirements/constraints
  - draft a concise plan when prompted

### Thread Commands (Current)

- `plan` / "make a plan": plan-drafting mode
- `health` / `groq` / `check` / `status`: Groq connectivity check (expects `OK`)
- `implement` / `go` / "start implementing": not wired yet (roadmap item)

## Setup

### Prerequisites

- Node.js 18+ (uses built-in `fetch`)
- A Discord application + bot token
- A Groq API key

### Environment

Copy `.env.example` to `.env` and fill in:

- `DISCORD_TOKEN` - Discord bot token
- `GROQ_API_KEY` - Groq API key
- `GROQ_MODEL` - Groq model name (defaults to `llama-3.1-8b-instant`)

### Install & Run

```bash
npm install
npm run dev
```

Build and run compiled output:

```bash
npm run build
npm start
```

## Implementation Notes

- The bot listens for `messageCreate` events and only responds in guild text channels when mentioned.
- It creates threads with an auto-archive duration of 24 hours.
- Thread context is currently the most recent ~20 messages from the thread (ordered oldest-to-newest).

## Roadmap (Pull-Request Based Execution)

Execution is intentionally not wired yet. The target workflow is:

1. Mention bot -> create thread -> refine requirements
2. Generate a plan -> user approves
3. Agent applies changes in a local checkout and opens a PR (no direct pushes to `main`)

Planned milestones:

- Add explicit modes and approvals (plan -> draft changes -> open PR)
- GitHub integration to open PRs (likely via `gh` or a GitHub App)
- Safe repo sandboxing (allowed commands, path allowlist, secrets redaction)
- Better context building (attachments, code blocks, configurable context window)
- Basic quality gates before PR (format/lint/tests) with summarized results
- Observability (structured logs, per-thread correlation)

## Security

- Do not commit `.env` (this repo ignores it via `.gitignore`).
- Treat `DISCORD_TOKEN` and `GROQ_API_KEY` as secrets.
