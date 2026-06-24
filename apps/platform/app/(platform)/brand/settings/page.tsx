import { listSiteSettings } from "@/modules/brand/settings/actions";
import BrandSettingsClient from "./client";

export default async function BrandSettingsPage() {
  const data = await listSiteSettings();
  return (
    <div className="max-w-5xl mx-auto p-8">
      <BrandSettingsClient initialSections={data.sections} />
    </div>
  );
}
