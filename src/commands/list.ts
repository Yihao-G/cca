import { Agent, type SDKAgentInfo } from "@cursor/sdk";
import { CcaError } from "../errors.js";
import { commonOptions, isJson, parseCliArgs, printJson, setJson } from "../output.js";
import { agentUrl, requireApiKey } from "../sdk.js";

const options = {
  ...commonOptions,
  all: { type: "boolean" as const },
  limit: { type: "string" as const },
  cursor: { type: "string" as const },
};

export const listHelp = `Usage: cca list [options]

List Cloud Agents, newest first.

Options:
  --all         Include archived agents
  --limit <n>   Agents per page (default: 20, max: 100)
  --cursor <c>  Pagination cursor from a previous response
  --json        Machine-readable output
  -h, --help    Show this help
`;

export async function listCommand(args: string[]): Promise<void> {
  const { values } = parseCliArgs(args, options);
  if (values.help) {
    process.stdout.write(listHelp);
    return;
  }
  setJson(Boolean(values.json));

  const limit = values.limit === undefined ? 20 : Number.parseInt(String(values.limit), 10);
  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    throw new CcaError("--limit must be an integer between 1 and 100.");
  }

  const apiKey = requireApiKey();
  const page = await Agent.list({
    runtime: "cloud",
    apiKey,
    limit,
    includeArchived: Boolean(values.all),
    ...(typeof values.cursor === "string" ? { cursor: values.cursor } : {}),
  });

  const items = page.items.map((item: SDKAgentInfo) => ({
    agentId: item.agentId,
    name: item.name,
    status: item.status ?? null,
    archived: item.archived ?? false,
    updatedAt: new Date(item.lastModified).toISOString(),
    createdAt: item.createdAt === undefined ? null : new Date(item.createdAt).toISOString(),
    env: "env" in item ? (item.env ?? null) : null,
    repos: "repos" in item ? (item.repos ?? null) : null,
    url: agentUrl(item.agentId),
  }));

  if (isJson()) {
    printJson({ items, nextCursor: page.nextCursor ?? null });
    return;
  }

  if (items.length === 0) {
    process.stdout.write("(no agents)\n");
    return;
  }

  for (const item of items) {
    const env = item.env?.name ? ` env=${item.env.name}` : "";
    process.stdout.write(
      `${item.agentId}  ${item.status ?? "-"}  ${item.updatedAt}  ${item.name}${env}\n`,
    );
  }
  if (page.nextCursor) process.stdout.write(`\nnext cursor: ${page.nextCursor}\n`);
}
