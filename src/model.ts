import type { ModelSelection } from "@cursor/sdk";
import type { CcaConfig } from "./config.js";
import { CcaError } from "./errors.js";

export interface ModelFlags {
  model?: unknown;
  effort?: unknown;
  context?: unknown;
  param?: unknown;
}

function stringValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" ? [value] : [];
}

export function resolveModel(flags: ModelFlags, config: CcaConfig): ModelSelection | undefined {
  const flagModel =
    typeof flags.model === "string" && flags.model.trim().length > 0
      ? flags.model.trim()
      : undefined;
  const id = flagModel ?? config.model?.id;

  const params: Record<string, string> = { ...(config.model?.params ?? {}) };

  if (typeof flags.effort === "string") params.effort = flags.effort;
  if (typeof flags.context === "string") params.context = flags.context;

  for (const entry of stringValues(flags.param)) {
    const index = entry.indexOf("=");
    if (index <= 0 || index === entry.length - 1) {
      throw new CcaError(`Invalid --param "${entry}". Use --param <id>=<value>.`);
    }
    const name = entry.slice(0, index).trim();
    const value = entry.slice(index + 1).trim();
    if (name.length === 0 || value.length === 0) {
      throw new CcaError(`Invalid --param "${entry}". Use --param <id>=<value>.`);
    }
    params[name] = value;
  }

  const paramList = Object.entries(params).map(([paramId, value]) => ({ id: paramId, value }));

  if (id === undefined) {
    if (paramList.length > 0) {
      throw new CcaError(
        "Model params provided but no model id. Pass --model <id> or run `cca config set model <id>`.",
      );
    }
    return undefined;
  }

  return paramList.length > 0 ? { id, params: paramList } : { id };
}
