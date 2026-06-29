import { redirect } from "next/navigation";

/**
 * Root redirect: / → /erp/dashboard
 *
 * 统一后台入口为 ERP 仪表盘。
 */
export default function RootPage() {
  redirect("/erp/dashboard");
}
