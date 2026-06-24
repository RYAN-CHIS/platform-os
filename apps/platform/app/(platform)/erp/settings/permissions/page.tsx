import { redirect } from "next/navigation";
/**
 * WO-P11B: /erp/settings/permissions → redirect to /settings/permissions
 * 清理重复 settings 入口，统一使用 /settings/* */
export default function ErpSettingsPermissionsRedirect() {
  redirect("/settings/permissions");
}
