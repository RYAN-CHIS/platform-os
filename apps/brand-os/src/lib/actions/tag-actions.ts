"use server";

import { revalidatePath } from "next/cache";
import { brandDb, type TagType } from "@/lib/brand-db-adapter";
import { requireContentEditor, requireAdmin } from "./auth";

// ── 标签查询（读：EDITOR+） ──

export async function getTags(type?: TagType) {
  const where = type ? { type } : {};
  return brandDb.tag.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { productTags: true, journalTags: true } } },
  });
}

export async function getTag(id: string) {
  return brandDb.tag.findUnique({
    where: { id },
    include: { productTags: true, journalTags: true },
  });
}

// ── 标签管理（写：ADMIN+） ──

export async function upsertTag(formData: FormData) {
  await requireAdmin();

  const id          = formData.get("id") as string | null;
  const name        = formData.get("name") as string;
  const slug        = formData.get("slug") as string;
  const description = formData.get("description") as string | null;
  const type        = formData.get("type") as string;

  if (!name || !slug || !type) throw new Error("name、slug、type 必填");

  const data = {
    name,
    slug,
    description: description ?? null,
    type: type as any,
  };

  if (id) {
    await brandDb.tag.update({ where: { id }, data });
  } else {
    await brandDb.tag.create({ data });
  }

  revalidatePath("/admin/tags");
  return { ok: true };
}

export async function deleteTag(id: string) {
  await requireAdmin();
  await brandDb.tag.delete({ where: { id } });
  revalidatePath("/admin/tags");
  return { ok: true };
}

// ── 作品绑定标签（EDITOR+） ──

export async function updateProductTags(productId: number, tagIds: string[]) {
  await requireContentEditor();
  await brandDb.productTag.deleteMany({ where: { productId } });
  if (tagIds.length > 0) {
    await brandDb.productTag.createMany({
      data: tagIds.map((tagId) => ({ productId, tagId })),
    });
  }
  revalidatePath("/admin/products");
  return { ok: true };
}

// ── 品牌志绑定标签（EDITOR+） ──

export async function updateJournalTags(journalId: string, tagIds: string[]) {
  await requireContentEditor();
  await brandDb.legacyJournalTag.deleteMany({ where: { journalId } });
  if (tagIds.length > 0) {
    await brandDb.legacyJournalTag.createMany({
      data: tagIds.map((tagId) => ({ journalId, tagId })),
    });
  }
  revalidatePath("/admin/journal");
  return { ok: true };
}
