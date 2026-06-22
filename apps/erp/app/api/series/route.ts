import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const list = await prisma.series.findMany({
    orderBy: { sortOrder: "asc" },
    include: { works: true },
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const data = await req.json();
  const item = await prisma.series.create({
    data: {
      code: data.code,
      name: data.name,
      sortOrder: data.sortOrder ?? 0,
    },
  });
  return NextResponse.json(item);
}
