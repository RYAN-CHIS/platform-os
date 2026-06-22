import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await prisma.series.findUnique({
    where: { id: Number(id) },
    include: { works: true },
  });
  return NextResponse.json(item);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();
  const item = await prisma.series.update({
    where: { id: Number(id) },
    data: {
      code: data.code,
      name: data.name,
      sortOrder: data.sortOrder ?? 0,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const seriesId = Number(id);

  await prisma.$transaction(async (tx) => {
    // 获取该系列下所有作品
    const works = await tx.works.findMany({
      where: { seriesId },
      select: { id: true },
    });
    const workIds = works.map((w) => w.id);

    if (workIds.length > 0) {
      // 获取作品下的产品
      const products = await tx.products.findMany({
        where: { workId: { in: workIds } },
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
      await tx.worksAssets.deleteMany({ where: { workId: { in: workIds } } });
      await tx.works.deleteMany({ where: { id: { in: workIds } } });
    }

    await tx.series.delete({ where: { id: seriesId } });
  });

  return NextResponse.json({ ok: true });
}
