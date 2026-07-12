import { brandDb } from "@/lib/brand-db-adapter";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50");

  const [items, total] = await Promise.all([
    brandDb.contactLead.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    brandDb.contactLead.count(),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
