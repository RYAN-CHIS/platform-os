"use server";

import { prisma } from "@yunwu/db";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createCrudAudit } from "@/lib/audit";

type MediaRow = {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  mediaType: string;
  category: string;
  alt: string | null;
  caption: string | null;
  tags: string | null;
  uploadedBy: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const VALID_MEDIA_TYPES = new Set(["IMAGE", "VIDEO", "DOCUMENT", "OTHER"]);
const BRAND_CATEGORY = "BRAND";

function refreshMediaPage() {
  try {
    revalidatePath("/brand/media");
  } catch (error) {
    console.warn(`[brand-media] revalidate skipped: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function toMediaRow(row: MediaRow) {
  return {
    ...row,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function normalizeMediaType(value: string) {
  const mediaType = value.toUpperCase();
  if (!VALID_MEDIA_TYPES.has(mediaType)) {
    throw new Error(`数据库写入失败：不支持的媒体类型 ${value}`);
  }
  return mediaType;
}

function formatDbError(error: unknown) {
  if (!(error instanceof Error)) return "数据库写入失败";
  const message = error.message || "数据库写入失败";
  if (message.includes("does not exist") && message.includes("MediaType")) {
    return "数据库写入失败：媒体枚举类型不匹配";
  }
  if (message.includes("violates foreign key constraint")) {
    return "数据库写入失败：关联用户不存在";
  }
  return `数据库写入失败：${message}`;
}

export async function listMedia(params?: {
  q?: string;
  mediaType?: string;
  menuGroup?: string;
  sort?: string;
  order?: string;
}) {
  try {
    const mediaType = params?.mediaType && params.mediaType !== "all"
      ? normalizeMediaType(params.mediaType)
      : null;
    const keyword = params?.q?.trim();

    const records = await prisma.$queryRaw<MediaRow[]>(Prisma.sql`
      SELECT
        id,
        filename,
        original_name AS "originalName",
        mime_type AS "mimeType",
        size,
        url,
        thumbnail_url AS "thumbnailUrl",
        width,
        height,
        duration,
        media_type::text AS "mediaType",
        category::text AS category,
        alt,
        caption,
        tags,
        uploaded_by AS "uploadedBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM media_assets
      WHERE category = ${BRAND_CATEGORY}::"MediaCategory"
        ${mediaType ? Prisma.sql`AND media_type = ${mediaType}::"MediaType"` : Prisma.sql``}
        ${keyword ? Prisma.sql`AND (filename ILIKE ${`%${keyword}%`} OR original_name ILIKE ${`%${keyword}%`} OR COALESCE(tags, '') ILIKE ${`%${keyword}%`})` : Prisma.sql``}
      ORDER BY created_at DESC
      LIMIT 200
    `);

    // Filter by menu group via tags field
    let rows = records.map(toMediaRow);
    if (params?.menuGroup && params.menuGroup !== "all") {
      rows = rows.filter((r) => {
        try {
          const tags = JSON.parse((r as any).tags || "{}");
          return tags.menuGroup === params.menuGroup;
        } catch {
          return false;
        }
      });
    }

    return { rows, total: rows.length, error: null };
  } catch (e: any) {
    return { rows: [], total: 0, error: e.message || "媒体列表查询失败" };
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
    if (!data.filename || !data.originalName || !data.mimeType || !data.url) {
      return { row: null, error: "数据库写入失败：上传接口返回内容不完整" };
    }
    if (!Number.isFinite(data.size) || data.size <= 0) {
      return { row: null, error: "数据库写入失败：文件大小无效" };
    }

    const mediaType = normalizeMediaType(data.mediaType);
    const tags = JSON.stringify({ menuGroup: data.menuGroup || "other" });

    const rows = await prisma.$queryRaw<MediaRow[]>(Prisma.sql`
      INSERT INTO media_assets (
        filename,
        original_name,
        mime_type,
        size,
        url,
        media_type,
        category,
        tags,
        alt,
        created_at,
        updated_at
      )
      VALUES (
        ${data.filename},
        ${data.originalName},
        ${data.mimeType},
        ${Math.round(data.size)},
        ${data.url},
        ${mediaType}::"MediaType",
        ${BRAND_CATEGORY}::"MediaCategory",
        ${tags},
        ${data.remark || null},
        NOW(),
        NOW()
      )
      RETURNING
        id,
        filename,
        original_name AS "originalName",
        mime_type AS "mimeType",
        size,
        url,
        thumbnail_url AS "thumbnailUrl",
        width,
        height,
        duration,
        media_type::text AS "mediaType",
        category::text AS category,
        alt,
        caption,
        tags,
        uploaded_by AS "uploadedBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `);
    const asset = toMediaRow(rows[0]);

    try { await createCrudAudit({ action: "CREATE", system: "BRAND", module: "media", targetId: asset.id, after: asset }); } catch {}
    refreshMediaPage();
    return { row: asset, error: null };
  } catch (e) {
    return { row: null, error: formatDbError(e) };
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
    refreshMediaPage();
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
    refreshMediaPage();
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
