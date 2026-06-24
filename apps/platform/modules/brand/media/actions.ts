"use server";

import { prisma } from "@yunwu/db";
import { revalidatePath } from "next/cache";
import { createCrudAudit } from "@/lib/audit";
import { MEDIA_MENU_GROUPS } from "./config";

export async function listMedia(params?: {
  q?: string;
  mediaType?: string;
  menuGroup?: string;
  sort?: string;
  order?: string;
}) {
  try {
    const where: any = {};
    if (params?.mediaType) where.mediaType = params.mediaType;
    if (params?.q) {
      where.OR = [
        { filename: { contains: params.q, mode: "insensitive" } },
        { originalName: { contains: params.q, mode: "insensitive" } },
        { tags: { contains: params.q, mode: "insensitive" } },
      ];
    }

    let records = await prisma.erpMediaAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Filter by menu group via tags field
    if (params?.menuGroup && params.menuGroup !== "all") {
      records = records.filter((r) => {
        try {
          const tags = JSON.parse((r as any).tags || "{}");
          return tags.menuGroup === params.menuGroup;
        } catch {
          return false;
        }
      });
    }

    return { rows: records, total: records.length, error: null };
  } catch (e: any) {
    return { rows: [], total: 0, error: e.message };
  }
}

export async function createMediaAsset(data: {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  mediaType: string;
  menuGroup?: string;
  remark?: string;
}) {
  try {
    const tags = JSON.stringify({ menuGroup: data.menuGroup || "other" });

    const asset = await prisma.erpMediaAsset.create({
      data: {
        filename: data.filename,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        url: data.url,
        mediaType: data.mediaType as any,
        category: "BRAND",
        tags,
        alt: data.remark || null,
      },
    });

    try { await createCrudAudit({ action: "CREATE", system: "BRAND", module: "media", targetId: asset.id, after: asset }); } catch {}
    revalidatePath("/brand/media");
    return { row: asset, error: null };
  } catch (e: any) {
    return { row: null, error: e.message };
  }
}

export async function updateMediaAsset(id: number, data: { menuGroup?: string; remark?: string }) {
  try {
    const updateData: any = {};
    if (data.menuGroup !== undefined) {
      updateData.tags = JSON.stringify({ menuGroup: data.menuGroup });
    }
    if (data.remark !== undefined) {
      updateData.alt = data.remark;
    }

    const asset = await prisma.erpMediaAsset.update({ where: { id }, data: updateData });
    revalidatePath("/brand/media");
    return { row: asset, error: null };
  } catch (e: any) {
    return { row: null, error: e.message };
  }
}

export async function deleteMediaAsset(id: number) {
  try {
    // Check references
    const refCount = await prisma.erpMediaReference.count({ where: { mediaId: id } });
    if (refCount > 0) {
      const refs = await prisma.erpMediaReference.findMany({ where: { mediaId: id }, take: 10 });
      const refDetails = refs.map((r) => `${r.entityType}:${r.entityId}`).join(", ");
      return { error: `该素材被 ${refCount} 处引用 (${refDetails})，请先解除引用后删除`, refCount };
    }

    const before = await prisma.erpMediaAsset.findUnique({ where: { id } });
    await prisma.erpMediaAsset.delete({ where: { id } });

    try { await createCrudAudit({ action: "DELETE", system: "BRAND", module: "media", targetId: id, before }); } catch {}
    revalidatePath("/brand/media");
    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function bulkDeleteMedia(ids: number[]) {
  const results: { id: number; error?: string }[] = [];
  for (const id of ids) {
    const r = await deleteMediaAsset(id);
    results.push({ id, error: r.error || undefined });
  }
  return { results };
}
