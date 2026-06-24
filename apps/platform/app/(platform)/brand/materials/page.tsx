import { listBrandMaterials } from "@/modules/brand/materials/actions";
import BrandMaterialsClient from "./client";

export default async function BrandMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let materials: Awaited<ReturnType<typeof listBrandMaterials>> = [];

  try {
    materials = await listBrandMaterials(q);
  } catch {}

  return <BrandMaterialsClient initialData={materials} searchQ={q || ""} />;
}
