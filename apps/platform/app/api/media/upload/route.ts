import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

// Allowed MIME types
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/pjpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
  "video/mp4", "video/quicktime", "video/webm",
  "application/pdf",
  "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip", "application/x-zip-compressed",
]);

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  pdf: "application/pdf",
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const isVercelRuntime = process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;

function jsonError(message: string, status: number, detail?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(detail || {}) }, { status });
}

function safeExtension(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return ext || "bin";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return jsonError("未选择文件", 400, { stage: "request" });
    }

    const ext = safeExtension(file.name);
    const mimeType = file.type || EXTENSION_MIME[ext] || "application/octet-stream";

    // Validate type
    if (!ALLOWED_TYPES.has(mimeType)) {
      return jsonError(`不支持的文件类型: ${mimeType || ext}`, 400, { stage: "validation", filename: file.name });
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return jsonError("文件超过10MB", 400, { stage: "validation", filename: file.name, maxSize: MAX_SIZE });
    }
    if (file.size <= 0) {
      return jsonError("文件为空", 400, { stage: "validation", filename: file.name });
    }

    // Generate unique filename
    const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    let url = "";
    let storage = "local";

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_V2;

    if (blobToken) {
      try {
        const blob = await put(`brand-media/${uniqueName}`, buffer, {
          access: "public",
          contentType: mimeType,
          addRandomSuffix: false,
          token: blobToken,
        });
        url = blob.url;
        storage = "vercel-blob";
      } catch (error) {
        console.error("[media-upload] Vercel Blob upload failed", error);
        return jsonError(`Storage 上传失败：${error instanceof Error ? error.message : "Vercel Blob 写入失败"}`, 500, {
          stage: "storage",
          storage: "vercel-blob",
          filename: file.name,
        });
      }
    } else if (isVercelRuntime) {
      return jsonError("Storage Token 未配置：缺少 BLOB_READ_WRITE_TOKEN", 500, {
        stage: "storage",
        storage: "vercel-blob",
        filename: file.name,
      });
    } else {
      const uploadDir = join(process.cwd(), "public", "uploads");

      // Ensure directory exists
      await mkdir(uploadDir, { recursive: true });

      // Write file
      const filePath = join(uploadDir, uniqueName);
      await writeFile(filePath, buffer);

      url = `/uploads/${uniqueName}`;
    }

    return NextResponse.json({
      url,
      filename: uniqueName,
      originalName: file.name,
      mimeType,
      size: file.size,
      storage,
    });
  } catch (error: any) {
    console.error("[media-upload] request failed", error);
    return jsonError(`上传接口 500：${error.message || "未知错误"}`, 500, { stage: "server" });
  }
}
