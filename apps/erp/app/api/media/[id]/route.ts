import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { deleteBlob } from "@/lib/blob";
import { MediaReferenceService } from "@/lib/media";

/**
 * GET /api/media/[id] — 媒体详情（含引用列表）
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: parseInt(id, 10) },
  });
  if (!asset) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const refs = await MediaReferenceService.getReferences(asset.id);
  const refCount = await MediaReferenceService.getReferenceCount(asset.id);

  return NextResponse.json({ ...asset, references: refs, _refCount: refCount });
}

/**
 * DELETE /api/media/[id] — 删除媒体文件（含 Blob 清理 + 引用解除）
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireEditor();
    if (user instanceof Response) return user;

    const { id } = await params;
    const assetId = parseInt(id, 10);

    const asset = await prisma.mediaAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    // 检查引用（media_references 会 CASCADE 删除，先做警告检查）
    const refCount = await MediaReferenceService.getReferenceCount(assetId);

    // 删除 Blob 文件
    try {
      await deleteBlob(asset.url);
      if (asset.thumbnailUrl) await deleteBlob(asset.thumbnailUrl);
    } catch (blobError) {
      console.warn("[Media DELETE] Blob 删除失败（可能已不存在）:", blobError);
    }

    // 删除数据库记录（CASCADE 删除 media_references 和 banners）
    await prisma.mediaAsset.delete({ where: { id: assetId } });

    return NextResponse.json({
      success: true,
      hadReferences: refCount > 0 ? refCount : 0,
    });
  } catch (error: any) {
    console.error("[Media DELETE]", error);
    return NextResponse.json(
      { error: error.message || "删除失败" },
      { status: 500 },
    );
  }
}
