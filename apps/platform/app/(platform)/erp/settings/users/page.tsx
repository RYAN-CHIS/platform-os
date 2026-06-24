import { redirect } from "next/navigation";
/**
 * WO-P11B: /erp/settings/users → redirect to /settings/users
 * 清理重复 settings 入口，统一使用 /settings/* */
export default function ErpSettingsUsersRedirect() {
  redirect("/settings/users");
}
