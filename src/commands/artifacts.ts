import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { Agent } from "@cursor/sdk";
import { CcaError } from "../errors.js";
import { commonOptions, isJson, parseCliArgs, printJson, setJson } from "../output.js";
import { requireApiKey } from "../sdk.js";

const options = {
  ...commonOptions,
  download: { type: "string" as const },
};

export const artifactsHelp = `Usage: cca artifacts <agentId> [options]

List artifacts (screenshots, videos, logs) produced by a Cloud Agent.

Options:
  --download <dir>  Download all artifacts into <dir>
  --json            Machine-readable output
  -h, --help        Show this help
`;

function localPath(dir: string, artifactPath: string): string {
  const relative = artifactPath.replace(/^artifacts\//, "");
  const base = resolve(dir);
  const target = resolve(base, relative);
  if (target !== base && !target.startsWith(`${base}${sep}`)) {
    throw new CcaError(`Refusing to write artifact outside download dir: ${artifactPath}`);
  }
  return target;
}

export async function artifactsCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseCliArgs(args, options);
  if (values.help) {
    process.stdout.write(artifactsHelp);
    return;
  }
  setJson(Boolean(values.json));

  const agentId = positionals[0];
  if (!agentId) throw new CcaError("Missing required argument <agentId>.");

  const apiKey = requireApiKey();
  const agent = await Agent.resume(agentId, { apiKey });
  const items = await agent.listArtifacts();

  const downloaded: Array<{ path: string; file: string }> = [];
  if (typeof values.download === "string") {
    for (const item of items) {
      const file = localPath(values.download, item.path);
      const buffer = await agent.downloadArtifact(item.path);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, buffer);
      downloaded.push({ path: item.path, file });
    }
  }

  if (isJson()) {
    printJson({ agentId, items, downloaded });
    return;
  }

  if (items.length === 0) {
    process.stdout.write("(no artifacts)\n");
    return;
  }

  const saved = new Map(downloaded.map((entry) => [entry.path, entry.file]));
  for (const item of items) {
    const file = saved.get(item.path);
    process.stdout.write(`${item.path}  ${item.sizeBytes} bytes${file ? `  -> ${file}` : ""}\n`);
  }
}
