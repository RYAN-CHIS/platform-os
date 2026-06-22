import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";

/**
 * GET /api/banners — Banner 列表
 */
export async function GET() {
  const items = await prisma.banner.findMany({
    include: { media: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(items);
}

/**
 * POST /api/banners — 创建 Banner
 */
export async function POST(req: Request) {
  try {
    const user = await requireEditor();
    if (user instanceof Response) return user;

    const data = await req.json();
    if (!data.title || !data.mediaId) {
      return NextResponse.json(
        { error: "标题和媒体不可为空" },
        { status: 400 },
      );
    }

    const banner = await prisma.banner.create({
      data: {
        title: data.title,
        subtitle: data.subtitle ?? null,
        mediaId: data.mediaId,
        linkUrl: data.linkUrl ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
      },
      include: { media: true },
    });

    return NextResponse.json(banner, { status: 201 });
  } catch (error: any) {
    console.error("[Banner POST]", error);
    return NextResponse.json(
      { error: error.message || "创建失败" },
      { status: 500 },
    );
  }
}
