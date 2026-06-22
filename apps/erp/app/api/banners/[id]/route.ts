import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";

/**
 * PUT /api/banners/[id] — 更新 Banner
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireEditor();
    if (user instanceof Response) return user;

    const { id } = await params;
    const data = await req.json();

    const existing = await prisma.banner.findUnique({
      where: { id: parseInt(id, 10) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Banner 不存在" }, { status: 404 });
    }

    const updated = await prisma.banner.update({
      where: { id: parseInt(id, 10) },
      data: {
        title: data.title ?? existing.title,
        subtitle: data.subtitle !== undefined ? data.subtitle : existing.subtitle,
        mediaId: data.mediaId ?? existing.mediaId,
        linkUrl: data.linkUrl !== undefined ? data.linkUrl : existing.linkUrl,
        sortOrder: data.sortOrder ?? existing.sortOrder,
        isActive: data.isActive ?? existing.isActive,
        startAt: data.startAt !== undefined
          ? (data.startAt ? new Date(data.startAt) : null)
          : existing.startAt,
        endAt: data.endAt !== undefined
          ? (data.endAt ? new Date(data.endAt) : null)
          : existing.endAt,
      },
      include: { media: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[Banner PUT]", error);
    return NextResponse.json(
      { error: error.message || "更新失败" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/banners/[id] — 删除 Banner
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireEditor();
    if (user instanceof Response) return user;

    const { id } = await params;
    const existing = await prisma.banner.findUnique({
      where: { id: parseInt(id, 10) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Banner 不存在" }, { status: 404 });
    }

    await prisma.banner.delete({ where: { id: parseInt(id, 10) } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Banner DELETE]", error);
    return NextResponse.json(
      { error: error.message || "删除失败" },
      { status: 500 },
    );
  }
}
