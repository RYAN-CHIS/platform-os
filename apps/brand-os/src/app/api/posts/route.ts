import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword");
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

  const where: any = {};
  if (keyword) where.title = { contains: keyword };
  if (category) where.category = category;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.journalPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.journalPost.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: Request) {
  const data = await req.json();
  const post = await prisma.journalPost.create({
    data: {
      title: data.title,
      slug: data.slug || data.title?.toLowerCase().replace(/\s+/g, "-"),
      content: data.content || "",
      excerpt: data.excerpt,
      category: data.category || "OBJECT",
      status: data.status || "DRAFT",
      coverImage: data.coverImage,
    },
  });
  return NextResponse.json(post, { status: 201 });
}
