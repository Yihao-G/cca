#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { artifactsCommand, artifactsHelp } from "./commands/artifacts.js";
import { listCommand, listHelp } from "./commands/list.js";
import { readCommand, readHelp } from "./commands/read.js";
import { runCommand, runHelp } from "./commands/run.js";
import { sendCommand, sendHelp } from "./commands/send.js";
import { CcaError, errorMessage } from "./errors.js";
import { isJson, printJson } from "./output.js";

const VERSION: string = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;

const help = `cca ${VERSION} — Cursor Cloud Agent CLI

Usage: cca <command> [options]

Commands:
  run        Create a Cloud Agent in a named environment and send a prompt
  send       Send a follow-up prompt to an existing agent
  read       Read a session (metadata + final message per run)
  list       List agents
  artifacts  List or download agent artifacts

Global:
  --json     Machine-readable output (available on every command)
  -h, --help Show help
  -v, --version  Show version

Requires CURSOR_API_KEY. Examples:

  cca run --env "QA" --prompt-file qa.md --json
  cca run --env "QA" --wait --json < task.txt
  cca read bc-123 --last --json
  cca send bc-123 --prompt "Also check the login flow" --json
`;

function commandHelp(command: string | undefined): string | undefined {
  switch (command) {
    case "run":
      return runHelp;
    case "send":
      return sendHelp;
    case "read":
      return readHelp;
    case "list":
      return listHelp;
    case "artifacts":
      return artifactsHelp;
    default:
      return undefined;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (!command || command === "help" || command === "-h" || command === "--help") {
    process.stdout.write(help);
    return;
  }

  if (command === "-v" || command === "--version" || command === "version") {
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  const rest = argv.slice(1);

  switch (command) {
    case "run":
      await runCommand(rest);
      return;
    case "send":
      await sendCommand(rest);
      return;
    case "read":
      await readCommand(rest);
      return;
    case "list":
      await listCommand(rest);
      return;
    case "artifacts":
      await artifactsCommand(rest);
      return;
    default: {
      const perCommand = commandHelp(command);
      if (perCommand) {
        process.stdout.write(perCommand);
        return;
      }
      throw new CcaError(`Unknown command "${command}". Run "cca --help" for usage.`);
    }
  }
}

main().catch((err) => {
  const message = errorMessage(err);
  if (isJson()) {
    printJson({ error: message });
  } else {
    process.stderr.write(`error: ${message}\n`);
  }
  process.exitCode = 1;
});
