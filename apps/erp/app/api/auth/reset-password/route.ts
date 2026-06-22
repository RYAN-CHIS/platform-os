import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/reset-password
 * 验证重置令牌 → 更新密码 → 清除令牌
 */
export async function POST(req: Request) {
  try {
    const { email, token, newPassword } = await req.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "密码长度不能少于6位" }, { status: 400 });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "无效的重置链接" }, { status: 400 });
    }

    // 验证令牌
    if (!user.resetToken || user.resetToken !== token) {
      return NextResponse.json({ error: "无效的重置令牌" }, { status: 400 });
    }

    // 验证是否过期
    if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      return NextResponse.json({ error: "重置链接已过期，请重新申请" }, { status: 400 });
    }

    // 更新密码并清除令牌
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "密码已成功重置，请使用新密码登录",
    });
  } catch (error) {
    console.error("重置密码失败:", error);
    return NextResponse.json({ error: "服务器错误，请稍后重试" }, { status: 500 });
  }
}
