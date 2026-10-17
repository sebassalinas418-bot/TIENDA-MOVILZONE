import { existsSync, readFileSync } from "fs";
import { join } from "path";

const KEY_NAMES = [
  "GEMINI_API_KEY",
  "NEXT_PUBLIC_GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_API_KEY",
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_OPENAI_API_KEY",
] as const;

let hydrated = false;

function applyEnvFile(fileName: string) {
  try {
    const full = join(process.cwd(), fileName);
    if (!existsSync(full)) return;
    for (const raw of readFileSync(full, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const cut = line.replace(/^export\s+/, "").match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!cut) continue;
      const name = cut[1];
      if (!KEY_NAMES.includes(name as (typeof KEY_NAMES)[number]) && name !== "GEMINI_MODEL" && name !== "NEXT_PUBLIC_GEMINI_MODEL") {
        continue;
      }
      if (process.env[name]?.trim()) continue;
      let value = cut[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[name] = value.replace(/\s+/g, "");
    }
  } catch {
    /* el archivo de env es opcional */
  }
}

function hydrateFromFiles() {
  if (hydrated) return;
  hydrated = true;
  applyEnvFile(".env.local");
  applyEnvFile(".env");
}

function firstEnv(names: readonly string[]) {
  hydrateFromFiles();
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/\s+/g, "");
    if (value) return value;
  }
  return "";
}

export function socialGeminiKey() {
  hydrateFromFiles();
  return (
    process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    firstEnv(["NEXT_PUBLIC_GEMINI_API_KEY", "GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_API_KEY"])
  ).replace(/\s+/g, "");
}

export function serverGeminiKey() {
  hydrateFromFiles();
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim() ||
    firstEnv(["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_API_KEY", "NEXT_PUBLIC_GEMINI_API_KEY"])
  ).replace(/\s+/g, "");
}

export function socialOpenAiKey() {
  return firstEnv(["NEXT_PUBLIC_OPENAI_API_KEY", "OPENAI_API_KEY"]);
}

export function socialGeminiModels() {
  hydrateFromFiles();
  const preferred = [
    process.env.GEMINI_MODEL?.trim(),
    process.env.NEXT_PUBLIC_GEMINI_MODEL?.trim(),
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
  ].filter((item, index, all): item is string => Boolean(item) && all.indexOf(item) === index);
  return preferred;
}
