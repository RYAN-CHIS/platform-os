import { prisma } from "@/lib/prisma";
import WorksClient from "./WorksClient";

export const dynamic = 'force-dynamic';

export default async function WorksPage() {
  const [works, series] = await Promise.all([
    prisma.works.findMany({ include: { series: true, assets: true, products: true }, orderBy: { createdAt: "desc" } }),
    prisma.series.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return <WorksClient works={works} series={series} />;
}
