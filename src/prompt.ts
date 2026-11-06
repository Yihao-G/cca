import { readFileSync } from "node:fs";
import { CcaError } from "./errors.js";

export interface PromptValues {
  prompt?: string | boolean;
  "prompt-file"?: string | boolean;
}

export async function resolvePrompt(values: PromptValues): Promise<string> {
  const file = values["prompt-file"];
  if (typeof file === "string") {
    try {
      return readFileSync(file, "utf8");
    } catch (err) {
      throw new CcaError(`Cannot read prompt file "${file}": ${(err as Error).message}`);
    }
  }

  if (typeof values.prompt === "string" && values.prompt.trim().length > 0) {
    return values.prompt;
  }

  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    const text = Buffer.concat(chunks).toString("utf8");
    if (text.trim().length > 0) return text;
  }

  throw new CcaError(
    "No prompt provided. Use --prompt <text>, --prompt-file <path>, or pipe text on stdin.",
  );
}
