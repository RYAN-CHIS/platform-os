import { listBanners } from "@/modules/brand/banners/actions";
import BrandBannersClient from "./client";

export default async function BrandBannersPage() {
  const data = await listBanners();
  return <div className="max-w-7xl mx-auto p-8">
    <BrandBannersClient initialData={data} />
  </div>;
}
