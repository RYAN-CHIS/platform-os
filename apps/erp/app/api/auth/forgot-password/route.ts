import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * POST /api/auth/forgot-password
 * 接收邮箱，生成重置令牌并返回重置链接
 * 生产环境应通过邮件发送链接；开发环境直接在响应中返回
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "请输入邮箱地址" }, { status: 400 });
    }

    // 查找用户（不暴露用户是否存在）
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      // 安全：不告知用户是否存在，统一返回"已发送"
      return NextResponse.json({
        success: true,
        message: "如果该邮箱已注册，重置链接将发送到您的邮箱",
      });
    }

    // 生成安全令牌（32字节十六进制）
    const token = crypto.randomBytes(32).toString("hex");
    // 1小时后过期
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    });

    // 开发环境：直接在响应中返回重置链接
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    console.log(`[忘记密码] 重置链接: ${resetUrl}`);

    return NextResponse.json({
      success: true,
      message: "重置链接已生成",
      // 开发环境返回链接（生产环境应移除并改为发邮件）
      resetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined,
    });
  } catch (error) {
    console.error("忘记密码请求失败:", error);
    return NextResponse.json({ error: "服务器错误，请稍后重试" }, { status: 500 });
  }
}
