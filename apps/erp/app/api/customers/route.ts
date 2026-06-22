import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/customers — 获取客户列表
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
    const source = searchParams.get("source") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (source) {
      where.source = source;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { orders: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      customers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("获取客户列表失败:", error);
    return NextResponse.json({ error: "获取客户列表失败" }, { status: 500 });
  }
}

// POST /api/customers — 创建新客户
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, email, wechat, source, address, tags, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "客户名称不能为空" }, { status: 400 });
    }

    // 自动生成客户编码 C + 序号
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { id: "desc" },
    });
    const nextId = (lastCustomer?.id || 0) + 1;
    const code = `C${String(nextId).padStart(4, "0")}`;

    const customer = await prisma.customer.create({
      data: {
        code,
        name: name.trim(),
        phone: phone || null,
        email: email || null,
        wechat: wechat || null,
        source: source || null,
        address: address || null,
        tags: tags ? JSON.stringify(tags) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error) {
    console.error("创建客户失败:", error);
    return NextResponse.json({ error: "创建客户失败" }, { status: 500 });
  }
}
