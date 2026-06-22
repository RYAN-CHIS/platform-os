import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const list = await prisma.works.findMany({
    orderBy: { createdAt: "desc" },
    include: { series: true, assets: true, products: true },
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const data = await req.json();
  const work = await prisma.works.create({
    data: {
      code: data.code,
      name: data.name,
      seriesId: data.seriesId,
      status: data.status ?? "DESIGNING",
    },
  });
  return NextResponse.json(work);
}
