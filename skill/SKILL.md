---
name: Cursor Cloud Agent CLI
description: Drive Cursor Cloud Agents from the terminal with the cca CLI. Use when work should run in a Cursor cloud VM instead of the local machine: creating an agent in a saved environment, handing off long-running tasks, streaming or waiting on runs, sending follow-ups, reading run results, listing agents, or downloading artifacts. Triggers include "cca", "cloud agent", "hand off to Cursor cloud", "run in the cloud", "check the cloud run", or "download the agent artifacts".
allowed-tools: Bash(cca:*)
---

# Cursor Cloud Agent CLI (cca)

`cca` wraps Cursor Cloud Agents. A cloud agent runs in an isolated VM with a full dev environment: it edits code, runs commands, tests, and records artifacts. `cca` creates agents, hands off work, follows runs, sends follow-ups, and pulls results.

## Prerequisites

- `cca` on PATH.
- `CURSOR_API_KEY` env var set (user API key or service account key).

## Commands

```
cca run    [--env <name>] [--prompt <t> | --prompt-file <f> | stdin] [model options] [--stream | --wait] [--json]
cca send   <agentId> [--prompt ...] [model options] [--stream | --wait] [--json]
cca read   <agentId> [--last] [--limit <n>] [--json]
cca list   [--all] [--limit <n>] [--cursor <c>] [--json]
cca artifacts <agentId> [--download <dir>] [--json]
cca models [--json]
cca config set|get|unset|list [--json]
```

Always pass `--json` when output will be parsed.

## run

Creates a new agent and sends the first prompt.

- `--env <name>`: saved Cloud environment, matched by exact name. Required unless a config default exists.
- Prompt sources: `--prompt`, `--prompt-file <path>`, or stdin. Use a file or stdin for long prompts.
- Default mode is hand-off: prints `agentId`, `runId`, `url` and exits. The run continues server-side.
- `--wait`: block until the run ends, then print the final assistant message.
- `--stream`: live events. Text mode renders assistant text and tool calls; with `--json`, one JSON object per line.

## send

Sends a follow-up prompt to an existing agent. Same prompt, model, streaming, and waiting options as `run`. Only one run can be active per agent; a second send while running fails.

## read

Reads an agent session: metadata plus the final assistant message of each run.

- `--last`: just the latest run's final message.
- `--limit <n>`: max runs to fetch (default 20, max 100).
- Full read returns every run's status, timing, model, and result.

Note: tool-call transcripts are not retrievable after a run; read returns final messages and metadata only.

## list

Lists agents, newest first. `--all` includes archived agents. Paginate with `--cursor` from the previous response.

## artifacts

Lists files an agent produced (screenshots, videos, logs). `--download <dir>` writes them locally.

## models

Lists model ids available to the account with supported params and values. Check this before passing model params.

## Model selection

Options on `run` and `send`:

- `--model <id>`
- `--effort <level>`
- `--context <size>`
- `--param <id>=<value>` (repeatable)

`--effort` and `--context` are shortcuts for params named `effort` and `context`. Param ids vary by model: some models use `reasoning_effort`, `reasoning`, `thinking`, or `fast` instead, and accepted values differ. Confirm with `cca models` before relying on a param.

Precedence: flags override config; params merge per key.

## Persistent config

Defaults live in `~/.config/cca/config.json` (honors `XDG_CONFIG_HOME`).

```
cca config set env <name>
cca config set model <id>
cca config set effort <level>
cca config set context <size>
cca config set param.<id> <value>
cca config list
```

With a config default, omit the corresponding flag.

## Environments

A saved environment defines the repositories, dependencies, secrets, and startup commands an agent gets. Environments can cover multiple repositories.

- Environment names are matched exactly.
- Include repository, branch, or PR checkout instructions in the prompt. `cca` has no branch flags.
- Environment setup (install/start scripts, Builds) is managed in the Cursor Cloud Agents dashboard, not by `cca`.

## Execution modes and exit codes

- Default: hand-off. Return the ids and exit.
- `--wait`: block, print the final message.
- `--stream`: live events.
- `--stream` and `--wait` are mutually exclusive.

Exit code is about CLI health, not task outcome:

- `0`: the run finished. An agent-reported failure is still `0`; read its final message for the verdict.
- `1`: CLI, network, or Cursor API error, or the run ended in `error`/`cancelled`.

## Typical loop

1. `cca run --env <name> --prompt-file task.md --json` — hand off.
2. `cca read <agentId> --last --json` — check the latest result.
3. `cca send <agentId> --prompt "..." --wait --json` — follow up when needed.
4. `cca artifacts <agentId> --download <dir> --json` — collect evidence.
