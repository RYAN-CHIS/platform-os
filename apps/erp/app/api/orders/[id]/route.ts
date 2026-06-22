import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/orders/[id] — 获取订单详情
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
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "无效的订单ID" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: { id: true, code: true, name: true, phone: true, email: true, wechat: true, address: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    // 解析 items JSON
    let parsedItems = [];
    try {
      parsedItems = JSON.parse(order.items || "[]");
    } catch {}

    return NextResponse.json({ ...order, parsedItems });
  } catch (error) {
    console.error("获取订单详情失败:", error);
    return NextResponse.json({ error: "获取订单详情失败" }, { status: 500 });
  }
}

// PUT /api/orders/[id] — 更新订单
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
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "无效的订单ID" }, { status: 400 });
    }

    const body = await req.json();
    const {
      customerId,
      channel,
      status,
      paymentStatus,
      items,
      subtotal,
      discount,
      totalAmount,
      paidAmount,
      shippingFee,
      platformOrderNo,
      shippingAddress,
      notes,
    } = body;

    const updateData: any = {};

    if (customerId) updateData.customerId = customerId;
    if (channel) updateData.channel = channel;
    if (status) updateData.status = status;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (items) updateData.items = JSON.stringify(items);
    if (subtotal !== undefined) updateData.subtotal = subtotal;
    if (discount !== undefined) updateData.discount = discount;
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
    if (paidAmount !== undefined) updateData.paidAmount = paidAmount;
    if (shippingFee !== undefined) updateData.shippingFee = shippingFee;
    if (platformOrderNo !== undefined) updateData.platformOrderNo = platformOrderNo || null;
    if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress ? JSON.stringify(shippingAddress) : null;
    if (notes !== undefined) updateData.notes = notes;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        customer: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("更新订单失败:", error);
    return NextResponse.json({ error: "更新订单失败" }, { status: 500 });
  }
}

// DELETE /api/orders/[id] — 删除订单
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
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "无效的订单ID" }, { status: 400 });
    }

    await prisma.order.delete({ where: { id: orderId } });

    return NextResponse.json({ success: true, message: "订单已删除" });
  } catch (error) {
    console.error("删除订单失败:", error);
    return NextResponse.json({ error: "删除订单失败" }, { status: 500 });
  }
}
