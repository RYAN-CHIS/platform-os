import { listSeoConfigs } from "@/modules/brand/seo/actions";
import BrandSeoClient from "./client";

export default async function BrandSeoPage() {
  const data = await listSeoConfigs();
  return (
    <div className="max-w-6xl mx-auto p-8">
      <BrandSeoClient initialConfigs={data.configs} />
    </div>
  );
}
