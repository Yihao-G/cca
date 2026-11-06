import {
  configPath,
  flatConfig,
  getKey,
  loadConfig,
  saveConfig,
  setKey,
  unsetKey,
} from "../config.js";
import { CcaError } from "../errors.js";
import { commonOptions, isJson, parseCliArgs, printJson, setJson } from "../output.js";

const options = {
  ...commonOptions,
};

export const configHelp = `Usage: cca config <subcommand> [args]

Manage the persistent cca config (~/.config/cca/config.json, honors XDG_CONFIG_HOME).

Subcommands:
  set <key> <value>   Set a config value
  get [key]           Print one value, or the whole config
  unset <key>         Remove a config value
  list                Print all values as key=value lines

Keys:
  env                 Default Cloud Agent environment name
  model               Default model id
  effort              Default model effort param (e.g. high)
  context             Default model context window param (e.g. 1m)
  param.<id>          Any other model param (e.g. param.fast=false)

Options:
  --json              Machine-readable output
  -h, --help          Show this help
`;

export async function configCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseCliArgs(args, options);
  if (values.help) {
    process.stdout.write(configHelp);
    return;
  }
  setJson(Boolean(values.json));

  const subcommand = positionals[0];
  const file = configPath();
  const config = loadConfig();

  switch (subcommand) {
    case "set": {
      const key = positionals[1];
      const value = positionals[2];
      if (!key || value === undefined) {
        throw new CcaError("Usage: cca config set <key> <value>");
      }
      setKey(config, key, value);
      saveConfig(config);
      if (isJson()) {
        printJson({ key, value, path: file });
      } else {
        process.stdout.write(`${key}=${value}\n`);
      }
      return;
    }
    case "get": {
      const key = positionals[1];
      if (key === undefined) {
        if (isJson()) {
          printJson({ path: file, config });
        } else {
          process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
        }
        return;
      }
      const value = getKey(config, key);
      if (isJson()) {
        printJson({ key, value: value ?? null, path: file });
      } else if (value !== undefined) {
        process.stdout.write(`${value}\n`);
      }
      return;
    }
    case "unset": {
      const key = positionals[1];
      if (!key) throw new CcaError("Usage: cca config unset <key>");
      const removed = unsetKey(config, key);
      saveConfig(config);
      if (isJson()) {
        printJson({ key, removed, path: file });
      } else {
        process.stdout.write(removed ? `${key} unset\n` : `${key} was not set\n`);
      }
      return;
    }
    case "list": {
      const entries = flatConfig(config);
      if (isJson()) {
        printJson({ path: file, entries });
        return;
      }
      for (const [key, value] of Object.entries(entries)) {
        process.stdout.write(`${key}=${value}\n`);
      }
      return;
    }
    default:
      process.stdout.write(configHelp);
  }
}
