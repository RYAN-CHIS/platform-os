import { prisma } from "@yunwu/db";
import { Prisma } from "@prisma/client";
import { createCrudAudit } from "@/lib/audit";

export type MediaRow = {
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

export const BRAND_CATEGORY = "BRAND";

const VALID_MEDIA_TYPES = new Set(["IMAGE", "VIDEO", "DOCUMENT", "OTHER"]);

export function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export function toMediaRow(row: MediaRow) {
  return {
    ...row,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function normalizeMediaType(value: string) {
  const mediaType = value.toUpperCase();
  if (!VALID_MEDIA_TYPES.has(mediaType)) {
    throw new Error(`数据库写入失败：不支持的媒体类型 ${value}`);
  }
  return mediaType;
}

export function formatDbError(error: unknown) {
  if (!(error instanceof Error)) return "数据库写入失败";
  const message = error.message || "数据库写入失败";
  if (message.startsWith("数据库写入失败")) return message;
  if (message.includes("does not exist") && message.includes("MediaType")) {
    return "数据库写入失败：媒体枚举类型不匹配";
  }
  if (message.includes("violates foreign key constraint")) {
    return "数据库写入失败：关联用户不存在";
  }
  return `数据库写入失败：${message}`;
}

export async function insertBrandMediaAsset(data: {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  mediaType: string;
  menuGroup?: string;
  remark?: string;
}) {
  if (!data.filename || !data.originalName || !data.mimeType || !data.url) {
    throw new Error("数据库写入失败：上传接口返回内容不完整");
  }
  if (!Number.isFinite(data.size) || data.size <= 0) {
    throw new Error("数据库写入失败：文件大小无效");
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

  if (!rows[0]) {
    throw new Error("数据库写入失败：未返回素材记录");
  }

  const asset = toMediaRow(rows[0]);
  try {
    await createCrudAudit({ action: "CREATE", system: "BRAND", module: "media", targetId: asset.id, after: asset });
  } catch {}
  return asset;
}
