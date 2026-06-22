// ═══════════════════════════════════════════════════════════
// Canonical Data Core — MaterialCore
// ═══════════════════════════════════════════════════════════

import type { SystemId } from "../control/system";

export interface MaterialCore {
  cid: string;
  name: string;
  type: string;
  description?: string;
  image?: string;

  // 库存
  inventory: number;
  unitCost: number;
  unit: string;

  // 来源
  origin?: string;
  supplier?: string;

  _sources: SystemId[];
  _lastSource: SystemId;
  createdAt: Date;
  updatedAt: Date;
}

export function createMaterialCore(params: {
  cid: string;
  name: string;
  type?: string;
  description?: string;
  image?: string;
  inventory?: number;
  unitCost?: number;
  unit?: string;
  origin?: string;
  supplier?: string;
  source: SystemId;
}): MaterialCore {
  return {
    cid: params.cid,
    name: params.name,
    type: params.type ?? "material",
    description: params.description,
    image: params.image,
    inventory: params.inventory ?? 0,
    unitCost: params.unitCost ?? 0,
    unit: params.unit ?? "个",
    origin: params.origin,
    supplier: params.supplier,
    _sources: [params.source],
    _lastSource: params.source,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
