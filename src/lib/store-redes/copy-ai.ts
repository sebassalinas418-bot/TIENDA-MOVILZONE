import { GoogleGenerativeAI } from "@google/generative-ai";
import { draftLocalInstagramCopy } from "@/lib/store-redes/copy-local";
import { draftWithOpenAi } from "@/lib/store-redes/copy-openai";
import { draftFromParsed, parseModelJson, type AiDraft } from "@/lib/store-redes/copy-parse";
import { communityManagerPrompt } from "@/lib/store-redes/copy-prompt";
import { socialGeminiKey, socialGeminiModels } from "@/lib/store-redes/gemini-key";
import type { SocialAiEngine, SocialProductSnap } from "@/lib/store-redes/types";

export { socialGeminiKey };
export type { AiDraft };

export function normalizeSocialAiEngine(value: unknown): SocialAiEngine {
  return value === "openai" ? "openai" : "gemini";
}

export async function draftInstagramCopy(
  product: SocialProductSnap,
  engine: SocialAiEngine = "gemini",
): Promise<AiDraft> {
  const fallback = draftLocalInstagramCopy(product);
  if (engine === "openai") return draftWithOpenAi(product, fallback);
  return draftWithGemini(product, fallback);
}

async function draftWithGemini(
  product: SocialProductSnap,
  fallback: ReturnType<typeof draftLocalInstagramCopy>,
): Promise<AiDraft> {
  const key = socialGeminiKey();
  if (!key) {
    return { ...fallback, hint: "Falta NEXT_PUBLIC_GEMINI_API_KEY o GEMINI_API_KEY en .env.local." };
  }

  let lastError = "";
  for (const modelName of socialGeminiModels()) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 1.05, responseMimeType: "application/json" },
      });
      const result = await model.generateContent(communityManagerPrompt(product));
      const parsed = parseModelJson(result.response.text().trim());
      if (!parsed) {
        lastError = "Gemini no devolvió JSON.";
        continue;
      }
      return draftFromParsed(parsed, fallback, product, "gemini");
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Gemini no respondió.";
    }
  }

  return { ...fallback, hint: lastError || "Gemini no respondió." };
}
