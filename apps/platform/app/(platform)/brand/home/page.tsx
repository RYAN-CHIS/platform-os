// WO-P13C: Brand Home — Publishing Workflow
import { getBrandStats, getPageContents, getSiteSettings } from "@/modules/brand/home/actions";
import { BrandHomeClient } from "./client";

export const dynamic = "force-dynamic";

export default async function BrandHomePage() {
  const [stats, pages, settings] = await Promise.all([
    getBrandStats(),
    getPageContents(),
    getSiteSettings(),
  ]);

  return (
    <BrandHomeClient
      initialStats={stats}
      initialPages={pages}
      initialSettings={settings}
    />
  );
}
