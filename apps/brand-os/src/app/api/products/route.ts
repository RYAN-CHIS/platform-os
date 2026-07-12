import { brandDb } from "@/lib/brand-db-adapter";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateSeriesId } from "@/lib/series-id";

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
  const seriesIdResult = validateSeriesId(data.seriesId);
  if (!seriesIdResult.valid) {
    return NextResponse.json({ error: seriesIdResult.error }, { status: 400 });
  }

  const product = await brandDb.legacyBrandProduct.create({
    data: {
      sku: data.sku || `P-${Date.now()}`,
      name: data.name,
      slug: data.slug || data.name?.toLowerCase().replace(/\s+/g, "-"),
      seriesId: seriesIdResult.seriesId,
      objectCategory: data.objectCategory || "BRACELET",
      theme: data.theme || "",
      story: data.story || "",
      materials: data.materials || "",
      costPrice: data.costPrice || 0,
      salePrice: data.salePrice || 0,
      coverImage: data.coverImage || "",
      status: data.status || "draft",
    },
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
  const { id, ...fields } = data;
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const product = await brandDb.legacyBrandProduct.update({
    where: { id: parseInt(id) },
    data: fields,
  });

  return NextResponse.json(product);
}
