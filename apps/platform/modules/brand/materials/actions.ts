// ══════════════════════════════════════════════════════════
// Brand Materials — actions
// ══════════════════════════════════════════════════════════

import { brandPrisma } from "@yunwu/db/brand";

export async function listBrandMaterials() {
  try {
    return await brandPrisma.brandMaterial.findMany({
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getMaterialStats() {
  try {
    return await brandPrisma.brandMaterial.count();
  } catch {
    return 0;
  }
}
