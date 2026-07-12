import { brandDb } from "@/lib/brand-db-adapter";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50");

  const where: any = {};
  if (category) where.category = category;

  const [items, total] = await Promise.all([
    brandDb.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    brandDb.media.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
