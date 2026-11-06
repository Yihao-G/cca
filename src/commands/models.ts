import { Cursor } from "@cursor/sdk";
import { commonOptions, isJson, parseCliArgs, printJson, setJson } from "../output.js";
import { requireApiKey } from "../sdk.js";

const options = {
  ...commonOptions,
};

export const modelsHelp = `Usage: cca models

List models available to this account, with their supported params.

Options:
  --json       Machine-readable output
  -h, --help   Show this help
`;

export async function modelsCommand(args: string[]): Promise<void> {
  const { values } = parseCliArgs(args, options);
  if (values.help) {
    process.stdout.write(modelsHelp);
    return;
  }
  setJson(Boolean(values.json));

  const apiKey = requireApiKey();
  const models = await Cursor.models.list({ apiKey });

  if (isJson()) {
    printJson(models);
    return;
  }

  for (const model of models) {
    const params = (model.parameters ?? [])
      .map((parameter) => `${parameter.id}(${parameter.values.map((entry) => entry.value).join("|")})`)
      .join(" ");
    process.stdout.write(
      `${model.id}  ${model.displayName}${params ? `  ${params}` : ""}\n`,
    );
  }
}
