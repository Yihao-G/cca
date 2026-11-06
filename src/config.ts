import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { CcaError } from "./errors.js";

export interface CcaConfig {
  env?: string;
  model?: {
    id?: string;
    params?: Record<string, string>;
  };
}

export function configPath(): string {
  const base = process.env.XDG_CONFIG_HOME?.trim() || join(homedir(), ".config");
  return join(base, "cca", "config.json");
}

export function loadConfig(): CcaConfig {
  const file = configPath();
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw new CcaError(`Cannot read config ${file}: ${(err as Error).message}`);
  }
  try {
    return JSON.parse(raw) as CcaConfig;
  } catch (err) {
    throw new CcaError(`Cannot parse config ${file}: ${(err as Error).message}`);
  }
}

export function saveConfig(config: CcaConfig): void {
  const file = configPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
}

function paramName(key: string): string | undefined {
  if (!key.startsWith("param.")) return undefined;
  const name = key.slice("param.".length);
  return name.length > 0 ? name : undefined;
}

export function getKey(config: CcaConfig, key: string): string | undefined {
  const param = paramName(key);
  if (param) return config.model?.params?.[param];
  switch (key) {
    case "env":
      return config.env;
    case "model":
      return config.model?.id;
    case "effort":
      return config.model?.params?.effort;
    case "context":
      return config.model?.params?.context;
    default:
      throw new CcaError(`Unknown config key "${key}".`);
  }
}

export function setKey(config: CcaConfig, key: string, value: string): void {
  if (value.trim().length === 0) {
    throw new CcaError(`Value for "${key}" must not be empty.`);
  }
  const param = paramName(key);
  if (param) {
    config.model ??= {};
    config.model.params ??= {};
    config.model.params[param] = value;
    return;
  }
  switch (key) {
    case "env":
      config.env = value;
      return;
    case "model":
      config.model ??= {};
      config.model.id = value;
      return;
    case "effort":
    case "context":
      config.model ??= {};
      config.model.params ??= {};
      config.model.params[key] = value;
      return;
    default:
      throw new CcaError(`Unknown config key "${key}".`);
  }
}

export function unsetKey(config: CcaConfig, key: string): boolean {
  const param = paramName(key);
  if (param) {
    if (!config.model?.params || config.model.params[param] === undefined) return false;
    delete config.model.params[param];
    return true;
  }
  switch (key) {
    case "env": {
      if (config.env === undefined) return false;
      delete config.env;
      return true;
    }
    case "model": {
      if (config.model?.id === undefined) return false;
      delete config.model.id;
      return true;
    }
    case "effort":
    case "context": {
      if (config.model?.params?.[key] === undefined) return false;
      delete config.model.params[key];
      return true;
    }
    default:
      throw new CcaError(`Unknown config key "${key}".`);
  }
}

export function flatConfig(config: CcaConfig): Record<string, string> {
  const entries: Record<string, string> = {};
  if (config.env !== undefined) entries.env = config.env;
  if (config.model?.id !== undefined) entries.model = config.model.id;
  for (const [name, value] of Object.entries(config.model?.params ?? {})) {
    entries[`param.${name}`] = value;
  }
  return entries;
}
