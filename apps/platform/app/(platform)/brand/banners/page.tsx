import { listBanners } from "@/modules/brand/banners/actions";
import BrandBannersClient from "./client";

// 始终从真实数据库读取，不使用构建期静态快照，保证刷新后数据真实存在
export const dynamic = "force-dynamic";

export default async function BrandBannersPage() {
  const data = await listBanners();
  return <div className="max-w-7xl mx-auto p-8">
    <BrandBannersClient initialData={data} />
  </div>;
}
