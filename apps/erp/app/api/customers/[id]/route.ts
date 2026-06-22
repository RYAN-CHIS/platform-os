import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/customers/[id] — 获取客户详情
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await context.params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: "无效的客户ID" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: { select: { orders: true } },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "客户不存在" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("获取客户详情失败:", error);
    return NextResponse.json({ error: "获取客户详情失败" }, { status: 500 });
  }
}

// PUT /api/customers/[id] — 更新客户
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await context.params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: "无效的客户ID" }, { status: 400 });
    }

    const body = await req.json();
    const { name, phone, email, wechat, source, address, tags, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "客户名称不能为空" }, { status: 400 });
    }

    const updateData: any = {
      name: name.trim(),
      phone: phone || null,
      email: email || null,
      wechat: wechat || null,
      source: source || null,
      address: address || null,
      tags: tags ? JSON.stringify(tags) : null,
      notes: notes || null,
    };

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
    });

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error("更新客户失败:", error);
    return NextResponse.json({ error: "更新客户失败" }, { status: 500 });
  }
}

// DELETE /api/customers/[id] — 删除客户（检查是否有订单关联）
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await context.params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: "无效的客户ID" }, { status: 400 });
    }

    // 检查是否有关联订单
    const orderCount = await prisma.order.count({
      where: { customerId },
    });

    if (orderCount > 0) {
      return NextResponse.json(
        { error: `该客户有 ${orderCount} 个关联订单，无法删除。请先删除关联订单` },
        { status: 400 }
      );
    }

    await prisma.customer.delete({ where: { id: customerId } });

    return NextResponse.json({ success: true, message: "客户已删除" });
  } catch (error) {
    console.error("删除客户失败:", error);
    return NextResponse.json({ error: "删除客户失败" }, { status: 500 });
  }
}
