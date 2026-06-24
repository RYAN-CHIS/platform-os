import { redirect } from "next/navigation";
/**
 * WO-P11B: /erp/settings/system → redirect to /settings/system
 * 清理重复 settings 入口，统一使用 /settings/* */
export default function ErpSettingsSystemRedirect() {
  redirect("/settings/system");
}
