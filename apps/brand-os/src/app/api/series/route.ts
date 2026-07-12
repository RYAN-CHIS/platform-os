import { brandDb } from "@/lib/brand-db-adapter";
import { NextResponse } from "next/server";

export async function GET() {
  const items = await brandDb.legacyBrandSeries.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json(items);
}
