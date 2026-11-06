import { CcaError } from "./errors.js";

export function requireApiKey(): string {
  const key = process.env.CURSOR_API_KEY?.trim();
  if (!key) {
    throw new CcaError(
      "CURSOR_API_KEY is not set. Create a user API key at https://cursor.com/dashboard/api and export it.",
    );
  }
  return key;
}

export function agentUrl(agentId: string): string {
  return `https://cursor.com/agents/${agentId}`;
}
