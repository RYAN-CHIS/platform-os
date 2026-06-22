import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * 获取作品资产（故事、设计理念、缩略图等）
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workId = parseInt(id);

  const assets = await prisma.worksAssets.findUnique({
    where: { workId },
  });

  return NextResponse.json(assets);
}

/**
 * 创建或更新作品资产
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workId = parseInt(id);

  const data = await req.json();

  const assets = await prisma.worksAssets.upsert({
    where: { workId },
    update: {
      story: data.story ?? null,
      designConcept: data.designConcept ?? null,
      thumbnail: data.thumbnail ?? null,
      gallery: data.gallery ?? null,
      videoUrl: data.videoUrl ?? null,
      quote: data.quote ?? null,
      launchDate: data.launchDate ? new Date(data.launchDate) : null,
    },
    create: {
      workId,
      story: data.story ?? null,
      designConcept: data.designConcept ?? null,
      thumbnail: data.thumbnail ?? null,
      gallery: data.gallery ?? null,
      videoUrl: data.videoUrl ?? null,
      quote: data.quote ?? null,
      launchDate: data.launchDate ? new Date(data.launchDate) : null,
    },
  });

  return NextResponse.json(assets);
}
