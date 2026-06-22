import { prisma } from "@/lib/prisma";
import SeriesClient from "./SeriesClient";

export const dynamic = 'force-dynamic';

export default async function SeriesPage() {
  const list = await prisma.series.findMany({ orderBy: { sortOrder: "asc" } });
  return <SeriesClient list={list} />;
}
