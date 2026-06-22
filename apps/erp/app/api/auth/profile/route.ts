import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// PUT /api/auth/profile — 更新个人资料（名称、头像）
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: "无法识别用户" }, { status: 400 });
    }

    const { name, avatar } = await req.json();

    const updateData: Record<string, string | null> = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "没有需要更新的内容" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "个人资料已更新",
      user,
    });
  } catch (error) {
    console.error("更新个人资料失败:", error);
    return NextResponse.json({ error: "更新个人资料失败" }, { status: 500 });
  }
}
