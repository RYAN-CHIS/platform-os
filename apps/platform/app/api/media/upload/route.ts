import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { formatDbError, insertBrandMediaAsset } from "@/modules/brand/media/repository";

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

function getMediaType(mimeType: string): "IMAGE" | "VIDEO" | "DOCUMENT" | "OTHER" {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType === "application/pdf" || mimeType === "text/csv" || mimeType.includes("spreadsheet")) {
    return "DOCUMENT";
  }
  return "OTHER";
}

function formString(value: FormDataEntryValue | null, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function parseBlobStoreIdFromToken(token: string) {
  // V1 format: vercel_blob_rw_{storeId}_{secret}
  // V2 format: vcp_{random_string}
  // Token parsing is best-effort. If it fails, BLOB_STORE_ID is the fallback.
  const parts = token.split("_");
  if (parts.length >= 5 && parts[0] === "vercel" && parts[1] === "blob") {
    return parts[3] || "";
  }
  // V2 vcp_ format
  if (parts.length >= 2 && parts[0] === "vcp") {
    return parts[1] || "";
  }
  return "";
}

function getBlobReadWriteToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim() || "";
  if (!token) return { token: "", error: "missing" as const };
  return { token, error: null };
}

function isBlobAuthError(message: string) {
  return [
    "Access denied",
    "Invalid `token` parameter",
    "Invalid `BLOB_READ_WRITE_TOKEN`",
    "invalid token",
    "unable to extract store ID",
    "No read-write token found",
    "No blob credentials found",
  ].some((part) => message.includes(part));
}

async function cleanupUpload(storage: string, url: string, blobToken: string) {
  if (!url) return;
  try {
    if (storage === "vercel-blob") {
      await del(url, { token: blobToken });
    } else if (url.startsWith("/uploads/")) {
      await unlink(join(process.cwd(), "public", url));
    }
  } catch (error) {
    console.warn("[media-upload] cleanup skipped:", error instanceof Error ? error.message : "unknown error");
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🩺 Diagnostic: log env context (safe values only)
    const diag = {
      VERCEL_ENV: process.env.VERCEL_ENV || "local",
      VERCEL_URL: process.env.VERCEL_URL || "",
      BLOB_STORE_ID_exists: !!process.env.BLOB_STORE_ID,
      BLOB_STORE_ID: process.env.BLOB_STORE_ID || "MISSING",
      BLOB_RW_TOKEN_prefix: process.env.BLOB_READ_WRITE_TOKEN
        ? process.env.BLOB_READ_WRITE_TOKEN.substring(0, 20) + "..."
        : "MISSING",
      BLOB_RW_TOKEN_parsed_store_id: parseBlobStoreIdFromToken(
        process.env.BLOB_READ_WRITE_TOKEN || ""
      ),
      BLOB_WEBHOOK_PUBLIC_KEY_exists: !!process.env.BLOB_WEBHOOK_PUBLIC_KEY,
    };
    console.log("[media-upload] 🩺 diag", JSON.stringify(diag));

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const menuGroup = formString(formData.get("menuGroup"), "other");
    const remark = formString(formData.get("remark"));

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
    let blobToken = "";

    const blobConfig = getBlobReadWriteToken();
    if (blobConfig.token) {
      blobToken = blobConfig.token;
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
        const errMsg = error instanceof Error ? error.message : "未知错误";
        console.error("[media-upload] Vercel Blob upload failed:", errMsg);

        // 🩺 Diagnostic: log raw error details
        if (error instanceof Error) {
          console.log("[media-upload] 🩺 blob put error", JSON.stringify({
            name: error.name,
            message: error.message.substring(0, 200),
            cause: typeof (error as any).cause === "string"
              ? (error as any).cause.substring(0, 200)
              : undefined,
            status: (error as any).status || (error as any).statusCode,
            code: (error as any).code,
          }));
        }

        if (isBlobAuthError(errMsg) || errMsg.includes("not found")) {
          // 🩺 Include store ID in error so we know which store was targeted
          const storeId = process.env.BLOB_STORE_ID || "(unknown)";
          const tokenStoreId = parseBlobStoreIdFromToken(blobToken);
          console.log("[media-upload] 🩺 store mismatch check", JSON.stringify({
            BLOB_STORE_ID: storeId,
            tokenParsedStoreId: tokenStoreId || "(unparseable)",
          }));
          return jsonError(
            `Vercel Blob Token 无法访问 platform-os-blob，请确认 Production/Preview 的 BLOB_READ_WRITE_TOKEN 来自同一个 Blob Store。`,
            500,
            {
              stage: "config",
              storage: "vercel-blob",
              requiredEnv: "BLOB_READ_WRITE_TOKEN",
              code: "BLOB_TOKEN_ACCESS_DENIED",
              detail: errMsg,
              storeId,
              tokenStoreId: tokenStoreId || "(unparseable)",
            }
          );
        }

        return jsonError(`Storage 上传失败：${errMsg}`, 500, {
          stage: "storage", storage: "vercel-blob", filename: file.name,
        });
      }
    } else if (isVercelRuntime) {
      return jsonError(
        "Vercel Blob 未配置：Production/Preview 缺少 BLOB_READ_WRITE_TOKEN。",
        500,
        { stage: "config", storage: "vercel-blob", requiredEnv: "BLOB_READ_WRITE_TOKEN", code: "BLOB_TOKEN_MISSING" }
      );
    } else {
      // Local dev fallback
      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      const filePath = join(uploadDir, uniqueName);
      await writeFile(filePath, buffer);
      url = `/uploads/${uniqueName}`;
    }

    let asset;
    try {
      asset = await insertBrandMediaAsset({
        filename: uniqueName,
        originalName: file.name,
        mimeType,
        size: file.size,
        url,
        mediaType: getMediaType(mimeType),
        menuGroup,
        remark,
      });
    } catch (error) {
      await cleanupUpload(storage, url, blobToken);
      return jsonError(formatDbError(error), 500, {
        stage: "database",
        storage,
        filename: file.name,
      });
    }
    try {
      revalidatePath("/brand/media");
    } catch (error) {
      console.warn("[media-upload] revalidate skipped:", error instanceof Error ? error.message : "unknown error");
    }

    return NextResponse.json({
      url,
      filename: uniqueName,
      originalName: file.name,
      mimeType,
      size: file.size,
      storage,
      asset,
    });
  } catch (error: any) {
    console.error("[media-upload] request failed", error);
    return jsonError(`上传接口 500：${error.message || "未知错误"}`, 500, { stage: "server" });
  }
}
