import { Agent } from "@cursor/sdk";
import { loadConfig } from "../config.js";
import { CcaError } from "../errors.js";
import { resolveModel } from "../model.js";
import { commonOptions, parseCliArgs, setJson } from "../output.js";
import { resolvePrompt } from "../prompt.js";
import { handleRun } from "../run-output.js";
import { agentUrl, requireApiKey } from "../sdk.js";

const options = {
  ...commonOptions,
  env: { type: "string" as const },
  name: { type: "string" as const },
  prompt: { type: "string" as const },
  "prompt-file": { type: "string" as const },
  model: { type: "string" as const },
  effort: { type: "string" as const },
  context: { type: "string" as const },
  param: { type: "string" as const, multiple: true },
  stream: { type: "boolean" as const },
  wait: { type: "boolean" as const },
};

export const runHelp = `Usage: cca run [--env <name>] [options]

Create a Cloud Agent and send it a prompt.

Options:
  --env <name>         Saved Cloud Agent environment name (default: config env)
  --name <label>       Agent name, shown in cca list (helps find runs later)
  --prompt <text>      Prompt text
  --prompt-file <path> Read prompt from a file
  --model <id>         Model id (default: config model)
  --effort <level>     Model effort param (e.g. high)
  --context <size>     Model context window param (e.g. 1m)
  --param <id>=<value> Any other model param (repeatable)
  --stream             Stream run events instead of handing off
  --wait               Wait for the run to finish and print the final message
  --json               Machine-readable output
  -h, --help           Show this help

Without --prompt or --prompt-file, the prompt is read from stdin.
`;

export async function runCommand(args: string[]): Promise<void> {
  const { values } = parseCliArgs(args, options);
  if (values.help) {
    process.stdout.write(runHelp);
    return;
  }
  setJson(Boolean(values.json));

  const config = loadConfig();

  const flagEnv =
    typeof values.env === "string" && values.env.trim().length > 0 ? values.env.trim() : undefined;
  const env = flagEnv ?? config.env;
  if (!env) {
    throw new CcaError(
      "No environment. Pass --env <name> or run `cca config set env <name>`.",
    );
  }

  if (values.stream && values.wait) {
    throw new CcaError("Use either --stream or --wait, not both.");
  }

  const prompt = await resolvePrompt(values);
  const model = resolveModel(values, config);
  const apiKey = requireApiKey();

  const name =
    typeof values.name === "string" && values.name.trim().length > 0
      ? values.name.trim()
      : undefined;

  const agent = await Agent.create({
    apiKey,
    ...(name ? { name } : {}),
    ...(model ? { model } : {}),
    cloud: { env: { type: "cloud", name: env } },
  });

  const run = await agent.send(prompt);
  await handleRun(run, values, { agentId: agent.agentId, url: agentUrl(agent.agentId) });
}
