import { connection } from "next/server";
import { canAccessStoreRedesRequest } from "@/lib/store-redes/access";
import {
  generateSocialPost,
  listSocialPosts,
  publishSocialPost,
  readSocialSchedule,
  runDueSocialPosts,
  saveSocialSchedule,
  socialMarketingStatus,
  storeRedesShopId,
} from "@/lib/store-redes/server";
import { normalizeSocialAiEngine } from "@/lib/store-redes/copy-ai";
import type { SocialAiEngine, SocialProductSnap, SocialSchedule } from "@/lib/store-redes/types";

function denied() {
  return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
}

function shopOrError() {
  const shopId = storeRedesShopId();
  if (!shopId) return { error: Response.json({ ok: false, error: "Falta TALLER_SHOP_ID." }, { status: 500 }) };
  return { shopId };
}

export async function GET(request: Request) {
  await connection();
  if (!canAccessStoreRedesRequest(request)) return denied();
  const shop = shopOrError();
  if ("error" in shop) return shop.error;
  try {
    const [posts, schedule] = await Promise.all([
      listSocialPosts(shop.shopId),
      readSocialSchedule(shop.shopId),
    ]);
    return Response.json({ ...posts, ...schedule, status: socialMarketingStatus() });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "No se pudo leer Redes." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  await connection();
  if (!canAccessStoreRedesRequest(request)) return denied();
  const shop = shopOrError();
  if ("error" in shop) return shop.error;
  try {
    const body = (await request.json()) as {
      action?: "generate" | "publish" | "schedule" | "tick";
      product?: SocialProductSnap;
      products?: SocialProductSnap[];
      random?: boolean;
      engine?: SocialAiEngine;
      id?: string;
      schedule?: Partial<SocialSchedule>;
    };
    if (body.action === "tick") {
      return Response.json(await runDueSocialPosts(shop.shopId));
    }
    if (body.action === "publish") {
      if (!body.id) return Response.json({ ok: false, error: "Falta el post." }, { status: 400 });
      const result = await publishSocialPost(shop.shopId, body.id);
      return Response.json(result, { status: result.ok ? 200 : 400 });
    }
    if (body.action === "schedule") {
      const result = await saveSocialSchedule(shop.shopId, body.schedule ?? {});
      return Response.json(result, { status: result.ok ? 200 : 400 });
    }
    const result = await generateSocialPost(shop.shopId, {
      product: body.product,
      products: body.products,
      random: body.random,
      engine: normalizeSocialAiEngine(body.engine),
    });
    return Response.json({ ...result, status: socialMarketingStatus() }, { status: result.ok ? 201 : 400 });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "No se pudo procesar Redes." },
      { status: 500 },
    );
  }
}
