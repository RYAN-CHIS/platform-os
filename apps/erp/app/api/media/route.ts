import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSessionUser, requireEditor } from "@/lib/auth";
import { uploadBlob, BLOB_ENABLED } from "@/lib/blob";
import { MediaReferenceService } from "@/lib/media";

/**
 * GET /api/media — 媒体列表（搜索/筛选/分页）
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword");
  const mediaType = searchParams.get("mediaType");
  const category = searchParams.get("category");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);

  const where: any = {};
  if (keyword) {
    where.OR = [
      { originalName: { contains: keyword } },
      { tags: { contains: keyword } },
      { alt: { contains: keyword } },
    ];
  }
  if (mediaType) where.mediaType = mediaType;
  if (category) where.category = category;

  const [items, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.mediaAsset.count({ where }),
  ]);

  // 批量获取引用计数
  const refCounts = await MediaReferenceService.getReferenceCounts(
    items.map((m) => m.id),
  );

  const list = items.map((m) => ({
    ...m,
    _refCount: refCounts.get(m.id) ?? 0,
  }));

  return NextResponse.json({
    items: list,
    total,
    page,
    pageSize,
    blobEnabled: BLOB_ENABLED,
  });
}

/**
 * POST /api/media — 上传媒体文件
 */
export async function POST(req: Request) {
  try {
    const user = await requireEditor();
    if (user instanceof Response) return user;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "OTHER";
    const tags = (formData.get("tags") as string) || "";
    const alt = (formData.get("alt") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    // 上传到 Vercel Blob
    let blobResult;
    try {
      blobResult = await uploadBlob(file, {
        filename: file.name,
        prefix: "media/",
      });
    } catch (blobError: any) {
      return NextResponse.json(
        { error: blobError.message || "文件存储失败" },
        { status: 500 },
      );
    }

    // 写入数据库
    const asset = await prisma.mediaAsset.create({
      data: {
        filename: blobResult.filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: blobResult.url,
        mediaType: file.type.startsWith("video") ? "VIDEO" : "IMAGE",
        category: category as any,
        alt: alt || file.name,
        tags: tags || null,
        uploadedBy: parseInt(user.id, 10),
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error: any) {
    console.error("[Media POST]", error);
    return NextResponse.json(
      { error: error.message || "上传失败" },
      { status: 500 },
    );
  }
}
