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
cca run    [--env <name>] [--name <label>] [--prompt <t> | --prompt-file <f> | stdin] [model options] [--stream | --wait] [--json]
cca send   <agentId> [--prompt ...] [model options] [--stream | --wait] [--json]
cca cancel <agentId> [--json]
cca read   <agentId> [--last] [--wait] [--limit <n>] [--json]
cca list   [--all] [--limit <n>] [--cursor <c>] [--json]
cca artifacts <agentId> [--download <dir>] [--json]
cca models [--json]
cca config set|get|unset|list [--json]
```

Model options: `--model <id>`, `--effort <level>` (e.g. `high`), `--context <size>` (e.g. `1m`), `--param <id>=<value>` (repeatable).

The environment owns the repository set; branch and PR instructions belong in the prompt.

Execution modes:

- default: hand-off. Prints `agentId`, `runId`, `url`; exits.
- `--stream`: live run events. Text mode renders assistant text, tool calls, terminal status. `--json` emits one JSON object per line.
- `--wait`: blocks until the run reaches a terminal state, then prints the final assistant message.
- `cca read <agentId> --wait`: attach to the active run and print its final message; use this to recover after an interrupted session. `--name` on `cca run` makes the agent findable in `cca list`.
- `cca cancel <agentId>`: cancel the active run. Fails when no run is active.

Exit codes: `0` when the run finished (including an AI-reported failure), `1` on CLI/network/Cursor errors or a run that ended in `error`/`cancelled`.

## Config

Persistent defaults live in `~/.config/cca/config.json` (honors `XDG_CONFIG_HOME`). CLI flags override config values; model params merge per key.

```bash
cca config set env fullstack
cca config set model composer-2
cca config set effort high
cca config set context 1m
cca config set param.fast false
cca config list
cca config get env
cca config unset effort
```

Keys: `env`, `model`, `effort`, `context`, `param.<id>`.

With a config env set, `cca run --prompt-file qa.md --json` needs no `--env`.

## Examples

```bash
cca models --json
cca run --prompt-file qa.md --json
cca run --env "QA" --wait --json < qa.md
cca read bc-123 --last --json
cca send bc-123 --prompt "Also check the login flow" --json
cca artifacts bc-123 --download ./evidence --json
```
