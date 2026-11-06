import { Agent, type Run } from "@cursor/sdk";
import { CcaError } from "../errors.js";
import { commonOptions, isJson, parseCliArgs, printJson, setJson } from "../output.js";
import { agentUrl, requireApiKey } from "../sdk.js";

const options = {
  ...commonOptions,
  last: { type: "boolean" as const },
  limit: { type: "string" as const },
};

export const readHelp = `Usage: cca read <agentId> [options]

Read a Cloud Agent session: metadata and the final message of each run.

Options:
  --last       Print only the final message of the latest run
  --limit <n>  Max runs to fetch (default: 20, max: 100)
  --json       Machine-readable output
  -h, --help   Show this help
`;

interface RunSummary {
  runId: string;
  status: Run["status"];
  createdAt: number | null;
  durationMs: number | null;
  model: Run["model"] | null;
  result: string | null;
  error: { message: string; code?: string } | null;
}

function summarizeRun(run: Run): RunSummary {
  return {
    runId: run.id,
    status: run.status,
    createdAt: run.createdAt ?? null,
    durationMs: run.durationMs ?? null,
    model: run.model ?? null,
    result: run.result ?? null,
    error: run.error ? { message: run.error.message, ...(run.error.code ? { code: run.error.code } : {}) } : null,
  };
}

async function listAllRuns(agentId: string, apiKey: string, limit: number): Promise<Run[]> {
  const items: Run[] = [];
  let cursor: string | undefined;

  while (items.length < limit) {
    const page = await Agent.listRuns(agentId, {
      runtime: "cloud",
      apiKey,
      limit: Math.min(100, limit - items.length),
      ...(cursor ? { cursor } : {}),
    });
    items.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }

  return items;
}

export async function readCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseCliArgs(args, options);
  if (values.help) {
    process.stdout.write(readHelp);
    return;
  }
  setJson(Boolean(values.json));

  const agentId = positionals[0];
  if (!agentId) throw new CcaError("Missing required argument <agentId>.");

  const limit = values.limit === undefined ? 20 : Number.parseInt(String(values.limit), 10);
  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    throw new CcaError("--limit must be an integer between 1 and 100.");
  }

  const apiKey = requireApiKey();
  const info = await Agent.get(agentId, { apiKey });
  const runs = await listAllRuns(agentId, apiKey, limit);

  if (values.last) {
    const latest = runs[0];
    if (!latest) throw new CcaError(`Agent ${agentId} has no runs yet.`);
    const detail = await Agent.getRun(latest.id, { runtime: "cloud", agentId, apiKey });
    const summary = summarizeRun(detail);

    if (isJson()) {
      printJson({ agentId, ...summary });
    } else if (summary.result) {
      process.stdout.write(`${summary.result}\n`);
    } else if (summary.error) {
      process.stdout.write(`${summary.error.message}\n`);
    } else {
      process.stdout.write(`(run ${summary.runId} has no final message yet)\n`);
    }
    return;
  }

  const summaries: RunSummary[] = [];
  for (const run of runs) {
    const detail = await Agent.getRun(run.id, { runtime: "cloud", agentId, apiKey });
    summaries.push(summarizeRun(detail));
  }

  if (isJson()) {
    printJson({
      agentId,
      name: info.name,
      status: info.status ?? null,
      archived: info.archived ?? false,
      env: "env" in info ? (info.env ?? null) : null,
      repos: "repos" in info ? (info.repos ?? null) : null,
      url: agentUrl(agentId),
      runs: summaries,
    });
    return;
  }

  const envName = "env" in info && info.env?.name ? info.env.name : undefined;
  const env = envName ? ` · env ${envName}` : "";
  process.stdout.write(`agent: ${agentId}\nname:  ${info.name}\nurl:   ${agentUrl(agentId)}${env}\n`);

  for (const summary of summaries) {
    const when =
      summary.createdAt === null ? "" : new Date(summary.createdAt).toISOString();
    process.stdout.write(`\n--- run ${summary.runId} [${summary.status}]${when ? ` ${when}` : ""}\n`);
    if (summary.result) {
      process.stdout.write(`${summary.result}\n`);
    } else if (summary.error) {
      process.stdout.write(`error: ${summary.error.message}\n`);
    } else {
      process.stdout.write("(no final message)\n");
    }
  }
}
