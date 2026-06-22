"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireContentEditor, requireAdmin } from "./auth";

// ── 页面内容管理（读操作：EDITOR+ 可访问） ──

export async function getPageContents(pageKey?: string) {
  const where = pageKey ? { pageKey } : {};
  return prisma.pageContent.findMany({
    where,
    orderBy: [{ pageKey: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getPageContent(id: string) {
  return prisma.pageContent.findUnique({ where: { id } });
}

// ── 写操作：ADMIN+ ──

export async function upsertPageContent(formData: FormData) {
  await requireContentEditor(); // EDITOR 可编辑内容

  const id        = formData.get("id") as string | null;
  const pageKey   = formData.get("pageKey") as string;
  const sectionKey = formData.get("sectionKey") as string;
  const title     = formData.get("title") as string;
  const content   = formData.get("content") as string;
  const image     = formData.get("image") as string | null;
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const published = formData.get("published") === "true";

  if (!pageKey || !sectionKey) throw new Error("pageKey 和 sectionKey 必填");

  const data = {
    pageKey,
    sectionKey,
    title: title ?? "",
    content: content ?? "",
    image: image || null,
    sortOrder,
    published,
  };

  if (id) {
    await prisma.pageContent.update({ where: { id }, data });
  } else {
    await prisma.pageContent.create({ data });
  }

  revalidatePath("/admin/content");
  return { ok: true };
}

export async function deletePageContent(id: string) {
  await requireAdmin();
  await prisma.pageContent.delete({ where: { id } });
  revalidatePath("/admin/content");
  return { ok: true };
}

// ── 公开查询（用于前台） ──

export async function getPublishedPageContents(pageKey: string) {
  return prisma.pageContent.findMany({
    where: { pageKey, published: true },
    orderBy: { sortOrder: "asc" },
  });
}
