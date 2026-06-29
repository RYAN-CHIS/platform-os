import { redirect } from "next/navigation";

/**
 * /platform → /erp/dashboard 重定向
 *
 * 统一后台入口为 /erp/dashboard。
 * /platform 作为旧入口保留本重定向以兼容书签和旧链接。
 */
export default function PlatformRedirectPage() {
  redirect("/erp/dashboard");
}
