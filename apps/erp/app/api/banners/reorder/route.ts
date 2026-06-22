import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";

/**
 * PUT /api/banners/reorder — 批量排序
 * Body: { ids: number[] } — 按新顺序排列的 ID 列表
 */
export async function PUT(req: Request) {
  try {
    const user = await requireEditor();
    if (user instanceof Response) return user;

    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: "ids 必须是非空数组" },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      ids.map((id: number, index: number) =>
        prisma.banner.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Banner Reorder]", error);
    return NextResponse.json(
      { error: error.message || "排序失败" },
      { status: 500 },
    );
  }
}
