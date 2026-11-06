import { Agent } from "@cursor/sdk";
import { CcaError } from "../errors.js";
import { commonOptions, parseCliArgs, setJson } from "../output.js";
import { resolvePrompt } from "../prompt.js";
import { handleRun } from "../run-output.js";
import { agentUrl, requireApiKey } from "../sdk.js";

const options = {
  ...commonOptions,
  env: { type: "string" as const },
  prompt: { type: "string" as const },
  "prompt-file": { type: "string" as const },
  model: { type: "string" as const },
  stream: { type: "boolean" as const },
  wait: { type: "boolean" as const },
};

export const runHelp = `Usage: cca run --env <name> [options]

Create a Cloud Agent in the named environment and send it a prompt.

Options:
  --env <name>         Saved Cloud Agent environment name (required)
  --prompt <text>      Prompt text
  --prompt-file <path> Read prompt from a file
  --model <id>         Model id (default: account default)
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

  const env = values.env;
  if (typeof env !== "string" || env.trim().length === 0) {
    throw new CcaError("Missing required option --env <name>.");
  }

  if (values.stream && values.wait) {
    throw new CcaError("Use either --stream or --wait, not both.");
  }

  const prompt = await resolvePrompt(values);
  const apiKey = requireApiKey();
  const model = typeof values.model === "string" ? { id: values.model } : undefined;

  const agent = await Agent.create({
    apiKey,
    ...(model ? { model } : {}),
    cloud: { env: { type: "cloud", name: env } },
  });

  const run = await agent.send(prompt);
  await handleRun(run, values, { agentId: agent.agentId, url: agentUrl(agent.agentId) });
}
