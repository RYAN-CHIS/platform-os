import { brandDb } from "@/lib/brand-db-adapter";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword");
  const type = searchParams.get("type");
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50");

  const where: any = {};
  if (keyword) where.name = { contains: keyword };
  if (type) where.type = type;

  const [items, total] = await Promise.all([
    brandDb.legacyBrandMaterial.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    brandDb.legacyBrandMaterial.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
