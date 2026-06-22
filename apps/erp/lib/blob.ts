/**
 * Vercel Blob 存储客户端
 * 用于媒体文件上传/删除/列表
 */

import { put, del, list, head, copy } from "@vercel/blob";

// 上传前检查（本地开发用 localhost，生产用 Vercel）
export const BLOB_ENABLED = !!(process.env.BLOB_READ_WRITE_TOKEN);

// 允许的文件类型
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "video/mp4",
  "video/webm",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface BlobUploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface BlobUploadError {
  error: string;
  code?: string;
}

/**
 * 上传文件到 Vercel Blob
 */
export async function uploadBlob(
  file: File | Buffer,
  options?: {
    filename?: string;
    prefix?: string; // 存储路径前缀，如 "media/images/"
  },
): Promise<BlobUploadResult> {
  if (!BLOB_ENABLED) {
    throw new Error("Blob 存储未配置，请设置 BLOB_READ_WRITE_TOKEN");
  }

  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
  const originalName = file instanceof File ? file.name : (options?.filename ?? "untitled");
  const mimeType = file instanceof File ? file.type : "application/octet-stream";

  // 安全校验
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`不支持的文件类型: ${mimeType}`);
  }
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const prefix = options?.prefix ?? "media/";
  const ext = originalName.split(".").pop() ?? "bin";
  const safeName = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(safeName, buffer, {
    access: "public",
    contentType: mimeType,
    addRandomSuffix: false,
  });

  return {
    url: blob.url,
    filename: safeName,
    size: buffer.length,
    mimeType,
  };
}

/**
 * 删除 Blob 文件
 */
export async function deleteBlob(url: string): Promise<void> {
  if (!BLOB_ENABLED) return;
  await del(url);
}

/**
 * 批量删除 Blob 文件
 */
export async function deleteBlobs(urls: string[]): Promise<void> {
  if (!BLOB_ENABLED || urls.length === 0) return;
  await del(urls);
}

/**
 * 列出 Blob 文件（分页）
 */
export async function listBlobs(prefix?: string, limit = 100, cursor?: string) {
  if (!BLOB_ENABLED) return { blobs: [], cursor: null, hasMore: false };
  const result = await list({ prefix, limit, cursor });
  return {
    blobs: result.blobs,
    cursor: result.cursor ?? null,
    hasMore: result.hasMore,
  };
}
