import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/** 生成订单编号: YW-20260618-0001 */
function generateOrderNo(lastId: number): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seq = String(lastId + 1).padStart(4, "0");
  return `YW-${y}${m}${d}-${seq}`;
}

// GET /api/orders — 获取订单列表
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const status = searchParams.get("status") || "";
    const channel = searchParams.get("channel") || "";
    const customerId = searchParams.get("customerId") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { orderNo: { contains: search } },
        { platformOrderNo: { contains: search } },
        { notes: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (customerId) where.customerId = parseInt(customerId);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: {
            select: { id: true, code: true, name: true, phone: true },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    // 解析 items JSON 计算商品数量
    const ordersWithCount = orders.map((o) => {
      let itemCount = 0;
      try {
        const items = JSON.parse(o.items || "[]");
        itemCount = items.reduce((sum: number, i: any) => sum + (i.qty || 0), 0);
      } catch {}
      return { ...o, itemCount };
    });

    return NextResponse.json({
      orders: ordersWithCount,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("获取订单列表失败:", error);
    return NextResponse.json({ error: "获取订单列表失败" }, { status: 500 });
  }
}

// POST /api/orders — 创建新订单
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await req.json();
    const {
      customerId,
      channel,
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

    if (!customerId) {
      return NextResponse.json({ error: "请选择客户" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "请添加订单商品" }, { status: 400 });
    }

    // 验证客户存在
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return NextResponse.json({ error: "客户不存在" }, { status: 400 });
    }

    // 生成订单编号
    const lastOrder = await prisma.order.findFirst({
      orderBy: { id: "desc" },
    });
    const orderNo = generateOrderNo(lastOrder?.id || 0);

    const order = await prisma.order.create({
      data: {
        orderNo,
        customerId,
        channel: channel || "MANUAL",
        items: JSON.stringify(items),
        subtotal: subtotal || 0,
        discount: discount || 0,
        totalAmount: totalAmount || 0,
        paidAmount: paidAmount || 0,
        shippingFee: shippingFee || 0,
        platformOrderNo: platformOrderNo || null,
        shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : null,
        notes: notes || null,
        createdBy: parseInt((session.user as any).id || "0"),
      },
      include: {
        customer: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error) {
    console.error("创建订单失败:", error);
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }
}
