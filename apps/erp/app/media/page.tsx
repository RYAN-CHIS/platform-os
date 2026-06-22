import { MediaClient } from "./MediaClient";

/**
 * 媒体中心 — Server Component
 * 不查询数据，数据全部由 MediaClient CSR 获取。
 */
export default function MediaPage() {
  return <MediaClient />;
}
