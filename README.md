# cca

CLI for Cursor Cloud Agents. Create agents in saved Cloud environments, hand off work, stream runs, send follow-ups, and pull artifacts.

Built for scripted callers: every command supports `--json`.

## Install

```bash
npm install
npm run build
npm link   # exposes `cca` on PATH
```

## Auth

```bash
export CURSOR_API_KEY="your-user-api-key"   # https://cursor.com/dashboard/api
```

## Commands

```
cca run    --env <name> [--prompt <t> | --prompt-file <f> | stdin] [--model <id>] [--stream | --wait] [--json]
cca send   <agentId> [--prompt ...] [--stream | --wait] [--json]
cca read   <agentId> [--last] [--limit <n>] [--json]
cca list   [--all] [--limit <n>] [--cursor <c>] [--json]
cca artifacts <agentId> [--download <dir>] [--json]
```

`run` requires a saved Cloud Agent environment name (exact match). The environment owns the repository set; branch and PR instructions belong in the prompt.

Execution modes:

- default: hand-off. Prints `agentId`, `runId`, `url`; exits.
- `--stream`: live run events. Text mode renders assistant text, tool calls, terminal status. `--json` emits one JSON object per line.
- `--wait`: blocks until the run reaches a terminal state, then prints the final assistant message.

Exit codes: `0` when the run finished (including an AI-reported failure), `1` on CLI/network/Cursor errors or a run that ended in `error`/`cancelled`.

## Examples

```bash
cca run --env "QA" --prompt-file qa.md --json
cca run --env "QA" --wait --json < qa.md
cca read bc-123 --last --json
cca send bc-123 --prompt "Also check the login flow" --json
cca artifacts bc-123 --download ./evidence --json
```
