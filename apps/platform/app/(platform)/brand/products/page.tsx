// WO-P12B: Brand Products — Full CRUD with ActionBar
import { listProducts } from "@/modules/brand/products/actions";
import { BrandProductsClient } from "./client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const { rows, error } = await listProducts(params.q);
  return <BrandProductsClient rows={rows} error={error} searchQ={params.q || ""} />;
}
