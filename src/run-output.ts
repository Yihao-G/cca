import { Agent, type Run, type RunResult } from "@cursor/sdk";
import { CcaError } from "./errors.js";
import { isJson, printJson, printJsonLine } from "./output.js";
import { requireApiKey } from "./sdk.js";

export interface RunContext {
  agentId: string;
  url: string;
}

export interface RunMode {
  stream?: string | boolean;
  wait?: string | boolean;
}

function exitCodeForStatus(status: RunResult["status"]): number {
  return status === "finished" ? 0 : 1;
}

async function streamRun(run: Run): Promise<void> {
  for await (const message of run.stream()) {
    if (isJson()) {
      printJsonLine(message);
      continue;
    }

    switch (message.type) {
      case "assistant":
        for (const block of message.message.content) {
          if (block.type === "text") process.stdout.write(block.text);
        }
        break;
      case "tool_call":
        process.stdout.write(`\n[tool] ${message.name} ${message.status}\n`);
        break;
      case "status":
        if (message.status !== "RUNNING") {
          process.stdout.write(`\n[status] ${message.status}\n`);
        }
        break;
      default:
        break;
    }
  }

  if (!isJson()) process.stdout.write("\n");
  process.exitCode = exitCodeForStatus(run.status === "running" ? "error" : run.status);
}

async function resolveWaitResult(result: RunResult, context: RunContext): Promise<RunResult> {
  if (result.status !== "finished" || result.result !== undefined) return result;
  try {
    const detail = await Agent.getRun(result.id, {
      runtime: "cloud",
      agentId: context.agentId,
      apiKey: requireApiKey(),
    });
    return {
      id: detail.id,
      status: detail.status === "running" ? result.status : detail.status,
      result: detail.result ?? result.result,
      error: detail.error ?? result.error,
      model: detail.model ?? result.model,
      durationMs: detail.durationMs ?? result.durationMs,
      git: detail.git ?? result.git,
      usage: detail.usage ?? result.usage,
    };
  } catch {
    return result;
  }
}

function printWaitResult(result: RunResult, context: RunContext): void {
  if (isJson()) {
    printJson({
      agentId: context.agentId,
      runId: result.id,
      url: context.url,
      status: result.status,
      result: result.result ?? null,
      error: result.error ?? null,
      model: result.model ?? null,
      durationMs: result.durationMs ?? null,
      git: result.git ?? null,
    });
  } else {
    if (result.result) process.stdout.write(`${result.result}\n`);
    if (result.error) process.stderr.write(`error: ${result.error.message}\n`);
    const seconds =
      result.durationMs === undefined ? "" : ` · ${(result.durationMs / 1000).toFixed(1)}s`;
    process.stdout.write(`---\nstatus: ${result.status}${seconds} · ${context.url}\n`);
  }
  process.exitCode = exitCodeForStatus(result.status);
}

export async function handleRun(run: Run, mode: RunMode, context: RunContext): Promise<void> {
  const stream = Boolean(mode.stream);
  const wait = Boolean(mode.wait);

  if (stream && wait) {
    throw new CcaError("Use either --stream or --wait, not both.");
  }

  if (stream) {
    await streamRun(run);
    return;
  }

  if (wait) {
    const result = await resolveWaitResult(await run.wait(), context);
    printWaitResult(result, context);
    return;
  }

  if (isJson()) {
    printJson({ agentId: context.agentId, runId: run.id, url: context.url });
  } else {
    process.stdout.write(`agent: ${context.agentId}\nrun:   ${run.id}\nurl:   ${context.url}\n`);
  }
}
