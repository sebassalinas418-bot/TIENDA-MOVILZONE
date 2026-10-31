function firstEnv(names: readonly string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/\s+/g, "");
    if (value) return value;
  }
  return "";
}

export function socialGeminiKey() {
  return (
    process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    firstEnv(["NEXT_PUBLIC_GEMINI_API_KEY", "GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_API_KEY"])
  ).replace(/\s+/g, "");
}

export function serverGeminiKey() {
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
  const preferred = [
    process.env.GEMINI_MODEL?.trim() || "",
    process.env.NEXT_PUBLIC_GEMINI_MODEL?.trim() || "",
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
  ].filter((item, index, all): item is string => Boolean(item) && all.indexOf(item) === index);
  return preferred;
}
