import { communityManagerPrompt } from "@/lib/store-redes/copy-prompt";
import { draftFromParsed, parseModelJson, type AiDraft, type LocalDraft } from "@/lib/store-redes/copy-parse";
import { socialOpenAiKey } from "@/lib/store-redes/gemini-key";
import type { SocialProductSnap } from "@/lib/store-redes/types";

export async function draftWithOpenAi(product: SocialProductSnap, fallback: LocalDraft): Promise<AiDraft> {
  const key = socialOpenAiKey();
  if (!key) {
    return { ...fallback, hint: "Falta NEXT_PUBLIC_OPENAI_API_KEY o OPENAI_API_KEY en .env.local." };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: communityManagerPrompt(product) },
          { role: "user", content: "Respondé SOLO el JSON del post de Instagram." },
        ],
      }),
    });
    const body = (await response.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };
    if (!response.ok) {
      return { ...fallback, hint: body.error?.message || `OpenAI ${response.status}` };
    }
    const raw = body.choices?.[0]?.message?.content?.trim() || "";
    const parsed = parseModelJson(raw);
    if (!parsed) return { ...fallback, hint: "ChatGPT no devolvió JSON." };
    return draftFromParsed(parsed, fallback, product, "openai");
  } catch (err) {
    return { ...fallback, hint: err instanceof Error ? err.message : "OpenAI no respondió." };
  }
}
