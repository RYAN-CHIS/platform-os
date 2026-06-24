// WO-P12B: Brand Series — Full CRUD with ActionBar
import { listSeries } from "@/modules/brand/series/actions";
import { BrandSeriesClient } from "./client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const { rows, error } = await listSeries(params.q);
  return <BrandSeriesClient rows={rows} error={error} searchQ={params.q || ""} />;
}
