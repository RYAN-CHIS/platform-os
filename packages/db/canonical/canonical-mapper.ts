// ═══════════════════════════════════════════════════════════
// Canonical Mapper — Domain → Canonical
//
// 将 legacy Domain 数据映射为 Canonical Model。
// 这是"收口"层：无论数据来自哪个表，进入 Canonical 后统一。
//
// Raw DB → Domain → Canonical → Fabric → View
// ═══════════════════════════════════════════════════════════

import type { DomainProduct, DomainSeries, DomainMaterial } from "../domain/types";
import type { ProductCore, CoreMediaRef } from "./product.core";
import { createProductCore, mergeProductCore } from "./product.core";
import type { SeriesCore } from "./series.core";
import { createSeriesCore } from "./series.core";
import type { MaterialCore } from "./material.core";
import { createMaterialCore } from "./material.core";
import type { SystemId } from "../control/system";

// ═══════════════════════════════════════════════════════════
// PRODUCT: Domain → Canonical
// ═══════════════════════════════════════════════════════════

/**
 * 从 ERP DomainProduct 映射为 ProductCore
 */
export function mapErpProductToCanonical(raw: DomainProduct): ProductCore {
  return createProductCore({
    cid: `erp:${raw.id}`,
    name: raw.name,
    price: raw.price ?? 0,
    cost: 0, // ERP 产品可能有关联成本
    inventory: raw.stock ?? 0,
    status: mapStatus(raw.status),
    seriesId: raw.seriesId,
    category: raw.objectCategory,
    coverImage: raw.coverImage,
    description: raw.description,
    slug: raw.slug ?? raw.code?.toLowerCase(),
    source: "erp",
  });
}

/**
 * 从 Brand DomainProduct 映射为 ProductCore
 */
export function mapBrandProductToCanonical(raw: DomainProduct): ProductCore {
  const gallery = parseGallery(raw.gallery);

  return createProductCore({
    cid: `brand:${raw.id}`,
    name: raw.name,
    slug: raw.slug,
    price: raw.price ?? 0,
    cost: 0,
    inventory: raw.stock ?? 0,
    status: mapStatus(raw.status),
    seriesId: raw.seriesId,
    category: raw.objectCategory,
    coverImage: raw.coverImage,
    gallery,
    description: raw.story ?? raw.description,
    story: raw.story,
    source: "brand",
  });
}

/**
 * 从 Web DomainProduct 映射为 ProductCore
 */
export function mapWebProductToCanonical(raw: DomainProduct): ProductCore {
  return createProductCore({
    cid: `web:${raw.id}`,
    name: raw.name,
    slug: raw.slug,
    price: raw.price ?? 0,
    inventory: raw.stock ?? 0,
    status: mapStatus(raw.status),
    seriesId: raw.seriesId,
    category: raw.objectCategory,
    coverImage: raw.coverImage,
    description: raw.description,
    source: "web",
  });
}

/**
 * 根据系统上下文自动选择映射器
 */
export function mapToProductCanonical(
  raw: DomainProduct,
  source: SystemId,
): ProductCore {
  switch (source) {
    case "erp": return mapErpProductToCanonical(raw);
    case "brand": return mapBrandProductToCanonical(raw);
    case "web": return mapWebProductToCanonical(raw);
  }
}

/**
 * 批量映射 + 合并同 slug 的产品（跨系统去重）
 */
export function mapAndMergeProducts(
  rows: DomainProduct[],
  source: SystemId,
): ProductCore[] {
  const mapped = rows.map((r) => mapToProductCanonical(r, source));

  // 按 slug 合并（同一个产品在不同系统中）
  const merged = new Map<string, ProductCore>();
  for (const core of mapped) {
    const existing = merged.get(core.slug);
    if (existing) {
      merged.set(core.slug, mergeProductCore(existing, core));
    } else {
      merged.set(core.slug, core);
    }
  }

  return Array.from(merged.values());
}

// ═══════════════════════════════════════════════════════════
// SERIES: Domain → Canonical
// ═══════════════════════════════════════════════════════════

export function mapToSeriesCanonical(
  raw: DomainSeries,
  source: SystemId,
): SeriesCore {
  return createSeriesCore({
    cid: `${source}:${raw.id}`,
    name: raw.name,
    slug: raw.slug ?? raw.code?.toLowerCase(),
    description: raw.description,
    coverImage: raw.coverImage,
    sortOrder: raw.sortOrder,
    isActive: raw.isActive,
    source,
  });
}

// ═══════════════════════════════════════════════════════════
// MATERIAL: Domain → Canonical
// ═══════════════════════════════════════════════════════════

export function mapToMaterialCanonical(
  raw: DomainMaterial,
  source: SystemId,
): MaterialCore {
  return createMaterialCore({
    cid: `${source}:${raw.id}`,
    name: raw.name,
    type: raw.type ?? raw.materialType ?? "material",
    description: raw.description,
    image: raw.image,
    inventory: raw.remaining ?? 0,
    unitCost: raw.unitCost ?? 0,
    unit: raw.inventoryUnit ?? "个",
    origin: raw.origin,
    supplier: raw.supplier,
    source,
  });
}

// ── Helpers ──

function mapStatus(status: string): ProductCore["status"] {
  const s = status?.toLowerCase() ?? "";
  if (s === "published" || s === "active" || s === "ready") return "active";
  if (s === "archived" || s === "paused") return "archived";
  return "draft";
}

function parseGallery(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
}
