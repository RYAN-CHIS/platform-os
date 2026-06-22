import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// 更新某材料的库存余量（直接设置）
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();
  const remaining = Number(data.remaining) ?? 0;

  const material = await prisma.rawMaterial.update({
    where: { id: Number(id) },
    data: { remaining },
  });
  return NextResponse.json(material);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.rawMaterial.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
