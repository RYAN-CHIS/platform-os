// ═══════════════════════════════════════════════════════════
// Data Fabric — Canonical Resolvers (Phase 4)
//
// ProductCore → System View（直接映射，无需 Domain 中间层）
//
// Raw DB → Domain → Canonical → Fabric → View
//                              ↑ 从此处开始
// ═══════════════════════════════════════════════════════════

import type { SystemId } from "../control/system";
import type { ProductCore } from "../canonical/product.core";
import type { SeriesCore } from "../canonical/series.core";
import type { MaterialCore } from "../canonical/material.core";
import type {
  ErpProductView, WebProductView, BrandProductView,
  ErpSeriesView, WebSeriesView, BrandSeriesView,
  ErpMaterialView, WebMaterialView, BrandMaterialView,
} from "./views";

// ═══════════════════════════════════════════════════════════
// PRODUCT: Canonical → View
// ═══════════════════════════════════════════════════════════

export function resolveErpProductFromCore(core: ProductCore): ErpProductView {
  return {
    id: parseId(core.cid),
    name: core.name,
    status: core.status,
    createdAt: core.createdAt,
    updatedAt: core.updatedAt,
    view: "erp",
    code: extractCode(core.cid, "erp"),
    defaultPrice: core.price,
    finishedStock: core.inventory,
    specification: "",
    markupRatio: 1,
    rarityLevel: 1,
    storyFactor: 1,
    skus: [],
    costs: {
      material: core.cost * 0.6,
      labor: core.cost * 0.3,
      packaging: core.cost * 0.1,
      total: core.cost,
    },
    stockStatus: core.inventory > 10 ? "sufficient" : core.inventory > 0 ? "low" : "out_of_stock",
    profitMargin: core.price > 0 ? Math.round(((core.price - core.cost) / core.price) * 10000) / 100 : 0,
  };
}

export function resolveWebProductFromCore(core: ProductCore): WebProductView {
  return {
    id: parseId(core.cid),
    name: core.name,
    status: core.status,
    createdAt: core.createdAt,
    updatedAt: core.updatedAt,
    view: "web",
    slug: core.slug,
    salePrice: core.price,
    coverImage: core.coverImage ?? "",
    description: core.description ?? core.story ?? "",
    stock: core.inventory,
    inStock: core.inventory > 0,
    seriesName: core.seriesName ?? "",
    objectCategory: core.category ?? "",
    tags: [],
    seo: {
      title: core.name,
      description: core.description?.slice(0, 160) ?? "",
    },
    gallery: core.gallery,
  };
}

export function resolveBrandProductFromCore(core: ProductCore): BrandProductView {
  return {
    id: parseId(core.cid),
    name: core.name,
    status: core.status,
    createdAt: core.createdAt,
    updatedAt: core.updatedAt,
    view: "brand",
    slug: core.slug,
    seriesName: core.seriesName ?? "",
    objectCategory: core.category ?? "",
    theme: "",
    story: core.story ?? core.description ?? "",
    inspiration: "",
    lifeStage: "",
    keywords: [],
    materials: [],
    coverImage: core.coverImage ?? "",
    gallery: core.gallery,
    hasFullStory: (core.story?.length ?? 0) > 50,
    contentScore: calculateContentScore(core),
  };
}

export function resolveProductFromCore(
  system: SystemId,
  core: ProductCore,
): ErpProductView | WebProductView | BrandProductView {
  switch (system) {
    case "erp": return resolveErpProductFromCore(core);
    case "web": return resolveWebProductFromCore(core);
    case "brand": return resolveBrandProductFromCore(core);
  }
}

// ═══════════════════════════════════════════════════════════
// SERIES: Canonical → View
// ═══════════════════════════════════════════════════════════

export function resolveSeriesFromCore(
  system: SystemId,
  core: SeriesCore,
): ErpSeriesView | WebSeriesView | BrandSeriesView {
  switch (system) {
    case "erp":
      return {
        id: parseId(core.cid), name: core.name, sortOrder: core.sortOrder,
        view: "erp", code: extractCode(core.cid, "erp"), productCount: core.productCount,
      };
    case "web":
      return {
        id: parseId(core.cid), name: core.name, sortOrder: core.sortOrder,
        view: "web", slug: core.slug,
        description: core.description ?? "",
        coverImage: core.coverImage ?? "",
        productCount: core.productCount,
      };
    case "brand":
      return {
        id: parseId(core.cid), name: core.name, sortOrder: core.sortOrder,
        view: "brand", slug: core.slug,
        description: core.description ?? "",
        coverImage: core.coverImage ?? "",
        heroText: "", longDesc: "",
        contentScore: (core.description ? 5 : 0) + (core.coverImage ? 3 : 0),
      };
  }
}

// ═══════════════════════════════════════════════════════════
// MATERIAL: Canonical → View
// ═══════════════════════════════════════════════════════════

export function resolveMaterialFromCore(
  system: SystemId,
  core: MaterialCore,
): ErpMaterialView | WebMaterialView | BrandMaterialView {
  switch (system) {
    case "erp":
      return {
        id: parseId(core.cid), name: core.name, view: "erp",
        code: extractCode(core.cid, "erp"), category: core.type,
        materialType: core.type, remaining: core.inventory,
        unitCost: core.unitCost, supplier: core.supplier ?? "",
        inventoryUnit: core.unit,
        stockStatus: core.inventory > 100 ? "sufficient" : core.inventory > 0 ? "low" : "out_of_stock",
      };
    case "web":
      return {
        id: parseId(core.cid), name: core.name, view: "web",
        displayName: core.name, description: core.description ?? "",
        image: core.image ?? "",
      };
    case "brand":
      return {
        id: parseId(core.cid), name: core.name, view: "brand",
        alias: core.name, type: core.type, origin: core.origin ?? "",
        description: core.description ?? "", features: "",
        history: "", image: core.image ?? "",
      };
  }
}

// ── Helpers ──

function parseId(cid: string): number {
  return parseInt(cid.split(":")[1] ?? "0", 10);
}

function extractCode(cid: string, system: string): string {
  return cid.startsWith(`${system}:`) ? cid.split(":")[1] ?? "" : "";
}

function calculateContentScore(core: ProductCore): number {
  let score = 0;
  if (core.story && core.story.length > 50) score += 3;
  if (core.description) score += 2;
  if (core.coverImage) score += 2;
  if (core.gallery.length > 0) score += 1;
  if (core.category) score += 1;
  if (core.seriesName) score += 1;
  return Math.min(score, 10);
}
