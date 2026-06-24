import { listSystemConfigs, getSystemStatus } from "@/modules/settings/system/actions";
import SystemClient from "./client";

export default async function SettingsSystemPage() {
  let configs: Awaited<ReturnType<typeof listSystemConfigs>> = [];
  let status: Awaited<ReturnType<typeof getSystemStatus>> = {
    erpConnected: false,
    brandConnected: false,
    userCount: 0,
    productCount: 0,
    brandProductCount: 0,
    journalCount: 0,
    orderCount: 0,
    nodeEnv: "unknown",
    hasDbUrl: false,
    hasBrandDbUrl: false,
  };

  try {
    [configs, status] = await Promise.all([
      listSystemConfigs(),
      getSystemStatus(),
    ]);
  } catch {}

  return <SystemClient initialConfigs={configs} initialStatus={status} />;
}
