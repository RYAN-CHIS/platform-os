// WO-P12B: Brand Journal — Full CRUD with ActionBar
import { listPosts } from "@/modules/brand/journal/actions";
import { BrandJournalClient } from "./client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const { rows, error } = await listPosts(params.q);
  return <BrandJournalClient rows={rows} error={error} searchQ={params.q || ""} />;
}
