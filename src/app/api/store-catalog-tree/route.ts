import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { removeStoreChild } from "@/services/taller-gestio/categories";
import { readStoreCatalogTree, writeStoreCatalogTree } from "@/services/store-catalog-tree/server";

const noStore = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function GET() {
  await connection();
  const tree = await readStoreCatalogTree();
  return Response.json({ ok: true, ...tree }, { headers: noStore });
}

export async function PUT(request: Request) {
  await connection();
  let body: { categories?: unknown; placements?: unknown } = {};
  try {
    body = (await request.json()) as { categories?: unknown; placements?: unknown };
  } catch {
    return Response.json({ ok: false, error: "JSON inválido." }, { status: 400, headers: noStore });
  }
  const result = await writeStoreCatalogTree(body);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 503, headers: noStore });
  }
  return Response.json({ ok: true, ...result.tree }, { headers: noStore });
}

function treeId(value: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 80);
}

export async function DELETE(request: Request) {
  await connection();
  const url = new URL(request.url);
  const parentId = treeId(url.searchParams.get("parentId"));
  const childId = treeId(url.searchParams.get("childId"));
  if (!parentId || !childId) {
    return Response.json({ ok: false, error: "Falta el id de la subcategoría." }, { status: 400, headers: noStore });
  }
  const current = await readStoreCatalogTree();
  const categories = removeStoreChild(current.categories, parentId, childId);
  const result = await writeStoreCatalogTree({
    categories,
    placements: current.placements,
  });
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 503, headers: noStore });
  }
  const stored = await readStoreCatalogTree();
  const parent = stored.categories.find((item) => item.id === parentId);
  if (parent?.children.some((child) => child.id === childId)) {
    return Response.json(
      { ok: false, error: "Storage no confirmó el borrado de la subcategoría." },
      { status: 503, headers: noStore },
    );
  }
  try {
    revalidatePath("/tienda");
    revalidatePath("/");
    revalidatePath("/admin");
  } catch {
    /* cacheComponents puede ignorar el tag; el JSON ya está persistido */
  }
  return Response.json({ ok: true, ...stored }, { headers: noStore });
}
