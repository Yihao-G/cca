import { parseArgs, type ParseArgsConfig } from "node:util";
import { CcaError } from "./errors.js";

export type OptionSpec = NonNullable<ParseArgsConfig["options"]>;

let jsonMode = false;

export function setJson(enabled: boolean): void {
  jsonMode = enabled;
}

export function isJson(): boolean {
  return jsonMode;
}

export function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

export function printJsonLine(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data)}\n`);
}

export function parseCliArgs(args: string[], options: OptionSpec) {
  try {
    return parseArgs({ args, options, allowPositionals: true, strict: true });
  } catch (err) {
    throw new CcaError((err as Error).message);
  }
}

export const commonOptions: OptionSpec = {
  json: { type: "boolean" },
  help: { type: "boolean", short: "h" },
};
