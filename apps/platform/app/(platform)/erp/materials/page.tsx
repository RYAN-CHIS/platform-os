/** Native Route: /platform/erp/materials. WO-P6B. */
import { MaterialsList } from "@/modules/erp/materials";

export default function MaterialsPage({ searchParams }: { searchParams: Record<string, string> }) {
  return <MaterialsList searchParams={searchParams} />;
}
