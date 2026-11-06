import { Agent } from "@cursor/sdk";
import { CcaError } from "../errors.js";
import { commonOptions, isJson, parseCliArgs, printJson, setJson } from "../output.js";
import { requireApiKey } from "../sdk.js";

const options = {
  ...commonOptions,
};

export const cancelHelp = `Usage: cca cancel <agentId>

Cancel the active run of a Cloud Agent.

Options:
  --json       Machine-readable output
  -h, --help   Show this help
`;

export async function cancelCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseCliArgs(args, options);
  if (values.help) {
    process.stdout.write(cancelHelp);
    return;
  }
  setJson(Boolean(values.json));

  const agentId = positionals[0];
  if (!agentId) throw new CcaError("Missing required argument <agentId>.");

  const apiKey = requireApiKey();
  const runs = await Agent.listRuns(agentId, { runtime: "cloud", apiKey, limit: 1 });
  const latest = runs.items[0];

  if (!latest) {
    throw new CcaError(`Agent ${agentId} has no runs to cancel.`);
  }

  if (latest.status !== "running") {
    throw new CcaError(
      `Agent ${agentId} has no active run. Latest run ${latest.id} is ${latest.status}.`,
    );
  }

  await Agent.cancelRun(latest.id, { runtime: "cloud", agentId, apiKey });

  if (isJson()) {
    printJson({ agentId, runId: latest.id, status: "cancelled" });
  } else {
    process.stdout.write(`cancelled ${agentId} run ${latest.id}\n`);
  }
}
