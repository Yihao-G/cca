import { Agent } from "@cursor/sdk";
import { CcaError } from "../errors.js";
import { commonOptions, parseCliArgs, setJson } from "../output.js";
import { resolvePrompt } from "../prompt.js";
import { handleRun } from "../run-output.js";
import { agentUrl, requireApiKey } from "../sdk.js";

const options = {
  ...commonOptions,
  prompt: { type: "string" as const },
  "prompt-file": { type: "string" as const },
  stream: { type: "boolean" as const },
  wait: { type: "boolean" as const },
};

export const sendHelp = `Usage: cca send <agentId> [options]

Send a follow-up prompt to an existing Cloud Agent.

Options:
  --prompt <text>      Prompt text
  --prompt-file <path> Read prompt from a file
  --stream             Stream run events instead of handing off
  --wait               Wait for the run to finish and print the final message
  --json               Machine-readable output
  -h, --help           Show this help

Without --prompt or --prompt-file, the prompt is read from stdin.
`;

export async function sendCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseCliArgs(args, options);
  if (values.help) {
    process.stdout.write(sendHelp);
    return;
  }
  setJson(Boolean(values.json));

  const agentId = positionals[0];
  if (!agentId) throw new CcaError("Missing required argument <agentId>.");

  if (values.stream && values.wait) {
    throw new CcaError("Use either --stream or --wait, not both.");
  }

  const prompt = await resolvePrompt(values);
  const apiKey = requireApiKey();

  const agent = await Agent.resume(agentId, { apiKey });
  const run = await agent.send(prompt);
  await handleRun(run, values, { agentId, url: agentUrl(agentId) });
}
