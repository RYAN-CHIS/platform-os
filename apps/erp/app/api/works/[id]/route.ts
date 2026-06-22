import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const work = await prisma.works.findUnique({
    where: { id: Number(id) },
    include: { series: true, assets: true, products: true },
  });
  return NextResponse.json(work);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();
  const work = await prisma.works.update({
    where: { id: Number(id) },
    data: {
      code: data.code,
      name: data.name,
      seriesId: data.seriesId,
      status: data.status ?? "DESIGNING",
    },
  });
  return NextResponse.json(work);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workId = Number(id);

  await prisma.$transaction(async (tx) => {
    // 获取该作品下的产品
    const products = await tx.products.findMany({
      where: { workId },
      select: { id: true },
    });
    const productIds = products.map((p) => p.id);

    if (productIds.length > 0) {
      const skus = await tx.productSku.findMany({
        where: { productId: { in: productIds } },
        select: { id: true },
      });
      const skuIds = skus.map((s) => s.id);

      if (skuIds.length > 0) {
        await tx.bom.deleteMany({ where: { skuId: { in: skuIds } } });
        await tx.productCost.deleteMany({ where: { skuId: { in: skuIds } } });
      }
      await tx.productSku.deleteMany({ where: { productId: { in: productIds } } });
      await tx.products.deleteMany({ where: { id: { in: productIds } } });
    }

    await tx.worksAssets.deleteMany({ where: { workId } });
    await tx.works.delete({ where: { id: workId } });
  });

  return NextResponse.json({ ok: true });
}
