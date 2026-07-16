import { brandDb } from "@/lib/brand-db-adapter";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateSeriesId } from "@/lib/series-id";
import { prepareProductMutationData } from "./mutation";

// GET — 产品列表（Brand 内容视图）
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword");
  const seriesId = searchParams.get("seriesId");
  const category = searchParams.get("category");
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50");

  const where: any = {};
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { sku: { contains: keyword } },
      { keywords: { contains: keyword } },
    ];
  }
  if (seriesId) where.seriesId = parseInt(seriesId);
  if (category) where.objectCategory = category;

  const [items, total] = await Promise.all([
    brandDb.legacyBrandProduct.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { series: { select: { name: true, slug: true } } },
    }),
    brandDb.legacyBrandProduct.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

// POST — 创建产品
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const data = await req.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return NextResponse.json({ error: "无效的请求体" }, { status: 400 });
  }
  let productData: Record<string, unknown>;
  try {
    productData = prepareProductMutationData(data as Record<string, unknown>, "create");
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "请求参数无效" }, { status: 400 });
  }
  const seriesIdResult = validateSeriesId(productData.seriesId);
  if (!seriesIdResult.valid) {
    return NextResponse.json({ error: seriesIdResult.error }, { status: 400 });
  }

  const product = await brandDb.legacyBrandProduct.create({
    data: { ...productData, seriesId: seriesIdResult.seriesId } as any,
  });

  return NextResponse.json(product, { status: 201 });
}

// PUT — 更新产品
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const data = await req.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return NextResponse.json({ error: "无效的请求体" }, { status: 400 });
  }
  const { id, ...fields } = data as Record<string, unknown>;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  let updateData: Record<string, unknown>;
  try {
    updateData = prepareProductMutationData(fields, "update");
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "请求参数无效" }, { status: 400 });
  }

  const product = await brandDb.legacyBrandProduct.update({
    where: { id: productId },
    data: updateData as any,
  });

  return NextResponse.json(product);
}
