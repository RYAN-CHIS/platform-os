// ═══════════════════════════════════════════════════════════
// Canonical Data Core — SeriesCore
// ═══════════════════════════════════════════════════════════

import type { SystemId } from "../control/system";

export interface SeriesCore {
  cid: string;
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;

  _sources: SystemId[];
  _lastSource: SystemId;
  createdAt: Date;
  updatedAt: Date;
}

export function createSeriesCore(params: {
  cid: string;
  name: string;
  slug?: string;
  description?: string;
  coverImage?: string;
  sortOrder?: number;
  isActive?: boolean;
  source: SystemId;
}): SeriesCore {
  return {
    cid: params.cid,
    name: params.name,
    slug: params.slug ?? params.name.toLowerCase().replace(/\s+/g, "-"),
    description: params.description,
    coverImage: params.coverImage,
    sortOrder: params.sortOrder ?? 0,
    isActive: params.isActive ?? true,
    productCount: 0,
    _sources: [params.source],
    _lastSource: params.source,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
