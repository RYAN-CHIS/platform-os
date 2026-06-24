// ═══════════════════════════════════════════════════════════
// Data Fabric — Data Resolvers
//
// resolveProduct(ctx, domainProduct) → System View
//
// 同一份数据，不同系统看到不同解释：
//   ERP   → resolveErpView(product)
//   Web   → resolveWebView(product)
//   Brand → resolveBrandView(product)
// ═══════════════════════════════════════════════════════════

import type { DomainProduct, DomainSeries, DomainMaterial } from "../domain/types";
import type { SystemId } from "../control/system";
import type {
  UnifiedProduct, UnifiedSeries, UnifiedMaterial,
} from "./types.fab";
import type {
  ErpProductView, WebProductView, BrandProductView,
  ErpSeriesView, WebSeriesView, BrandSeriesView,
  ErpMaterialView, WebMaterialView, BrandMaterialView,
} from "./views";

// ═══════════════════════════════════════════════════════════
// PRODUCT RESOLVERS
// ═══════════════════════════════════════════════════════════

/**
 * DomainProduct → UnifiedProduct（全字段展开）
 */
export function toUnifiedProduct(raw: DomainProduct): UnifiedProduct {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    erp: {
      code: raw.code,
      workId: raw.workId,
      workName: undefined, // 需 join
      defaultPrice: raw.price,
      finishedStock: raw.stock,
      specification: raw.specification as string,
      markupRatio: raw.markupRatio as number,
      rarityLevel: raw.rarityLevel as number,
      storyFactor: raw.storyFactor as number,
      skus: undefined,
      materialCost: undefined,
      laborCost: undefined,
      packagingCost: undefined,
      totalCost: undefined,
    },
    brand: {
      slug: raw.slug,
      seriesId: raw.seriesId,
      objectCategory: raw.objectCategory,
      theme: raw.theme,
      story: raw.story,
      inspiration: raw.inspiration,
      keywords: raw.keywords,
      lifeStage: raw.lifeStage,
      suitableFor: raw.suitableFor,
      materials: raw.materials,
      gallery: raw.gallery ? JSON.parse(raw.gallery) : undefined,
    },
    web: {
      salePrice: raw.price,
      coverImage: raw.coverImage,
      description: raw.description,
      stock: raw.stock,
    },
  };
}

/**
 * 解析为 ERP 运营视图
 */
export function resolveErpProduct(unified: UnifiedProduct): ErpProductView {
  const stock = unified.erp.finishedStock ?? 0;
  const costs = {
    material: unified.erp.materialCost ?? 0,
    labor: unified.erp.laborCost ?? 0,
    packaging: unified.erp.packagingCost ?? 0,
    total: unified.erp.totalCost ?? 0,
  };
  const defaultPrice = unified.erp.defaultPrice ?? 0;

  return {
    id: unified.id,
    name: unified.name,
    status: unified.status,
    createdAt: unified.createdAt,
    updatedAt: unified.updatedAt,
    view: "erp",
    code: unified.erp.code ?? "",
    workId: unified.erp.workId,
    workName: unified.erp.workName,
    defaultPrice,
    finishedStock: stock,
    specification: unified.erp.specification ?? "",
    markupRatio: unified.erp.markupRatio ?? 1,
    rarityLevel: unified.erp.rarityLevel ?? 1,
    storyFactor: unified.erp.storyFactor ?? 1,
    skus: unified.erp.skus ?? [],
    costs,
    stockStatus: stock > 10 ? "sufficient" : stock > 0 ? "low" : "out_of_stock",
    profitMargin: costs.total > 0
      ? Math.round(((defaultPrice - costs.total) / defaultPrice) * 10000) / 100
      : 0,
  };
}

/**
 * 解析为 Web 展示视图
 */
export function resolveWebProduct(unified: UnifiedProduct): WebProductView {
  const stock = unified.web.stock ?? unified.erp.finishedStock ?? 0;
  const tags = unified.web.tags ?? [];
  const gallery = unified.brand.gallery ?? [];

  return {
    id: unified.id,
    name: unified.name,
    status: unified.status,
    createdAt: unified.createdAt,
    updatedAt: unified.updatedAt,
    view: "web",
    slug: unified.brand.slug ?? `product-${unified.id}`,
    salePrice: unified.web.salePrice ?? 0,
    coverImage: unified.web.coverImage ?? "",
    description: unified.web.description ?? unified.brand.story ?? "",
    stock,
    inStock: stock > 0,
    seriesName: unified.brand.seriesName ?? "",
    objectCategory: unified.brand.objectCategory ?? "",
    tags,
    seo: {
      title: unified.web.seoTitle ?? unified.name,
      description: unified.web.seoDescription ?? unified.brand.story?.slice(0, 160) ?? "",
    },
    gallery,
  };
}

/**
 * 解析为 Brand 内容视图
 */
export function resolveBrandProduct(unified: UnifiedProduct): BrandProductView {
  const materials = unified.brand.materials
    ? unified.brand.materials.split(",").map((m) => m.trim()).filter(Boolean)
    : [];
  const keywords = unified.brand.keywords
    ? unified.brand.keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [];
  const gallery = unified.brand.gallery ?? [];

  // 内容完整度评分
  let score = 0;
  if (unified.brand.story) score += 3;
  if (unified.brand.inspiration) score += 2;
  if (unified.brand.theme) score += 1;
  if (unified.brand.lifeStage) score += 1;
  if (unified.web.coverImage) score += 1;
  if (materials.length > 0) score += 1;
  if (keywords.length > 0) score += 1;

  return {
    id: unified.id,
    name: unified.name,
    status: unified.status,
    createdAt: unified.createdAt,
    updatedAt: unified.updatedAt,
    view: "brand",
    slug: unified.brand.slug ?? `product-${unified.id}`,
    seriesName: unified.brand.seriesName ?? "",
    objectCategory: unified.brand.objectCategory ?? "",
    theme: unified.brand.theme ?? "",
    story: unified.brand.story ?? "",
    inspiration: unified.brand.inspiration ?? "",
    lifeStage: unified.brand.lifeStage ?? "",
    keywords,
    materials,
    coverImage: unified.web.coverImage ?? unified.web.coverImage ?? "",
    gallery,
    hasFullStory: score >= 5,
    contentScore: Math.min(score, 10),
  };
}

/**
 * 主入口：根据系统上下文解析产品视图
 */
export function resolveProduct(
  system: SystemId,
  raw: DomainProduct,
): ErpProductView | WebProductView | BrandProductView {
  const unified = toUnifiedProduct(raw);
  switch (system) {
    case "erp": return resolveErpProduct(unified);
    case "web": return resolveWebProduct(unified);
    case "brand": return resolveBrandProduct(unified);
  }
}

// ═══════════════════════════════════════════════════════════
// SERIES RESOLVER
// ═══════════════════════════════════════════════════════════

export function toUnifiedSeries(raw: DomainSeries): UnifiedSeries {
  return {
    id: raw.id,
    name: raw.name,
    sortOrder: raw.sortOrder,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    erp: { code: raw.code },
    brand: {
      slug: raw.slug,
      description: raw.description,
      coverImage: raw.coverImage,
      heroText: raw.heroText,
      longDesc: raw.longDesc,
      shortDesc: raw.shortDesc,
    },
    web: {
      isActive: raw.isActive,
      productCount: undefined,
    },
  };
}

export function resolveSeries(
  system: SystemId,
  raw: DomainSeries,
): ErpSeriesView | WebSeriesView | BrandSeriesView {
  const u = toUnifiedSeries(raw);
  switch (system) {
    case "erp":
      return {
        id: u.id, name: u.name, sortOrder: u.sortOrder,
        view: "erp", code: u.erp.code ?? "", productCount: u.erp.productCount ?? 0,
      };
    case "web":
      return {
        id: u.id, name: u.name, sortOrder: u.sortOrder,
        view: "web", slug: u.brand.slug ?? "",
        description: u.brand.description ?? "",
        coverImage: u.brand.coverImage ?? "",
        productCount: u.web.productCount ?? 0,
      };
    case "brand":
      return {
        id: u.id, name: u.name, sortOrder: u.sortOrder,
        view: "brand", slug: u.brand.slug ?? "",
        description: u.brand.description ?? "",
        coverImage: u.brand.coverImage ?? "",
        heroText: u.brand.heroText ?? "",
        longDesc: u.brand.longDesc ?? "",
        contentScore: (u.brand.description ? 3 : 0) + (u.brand.coverImage ? 2 : 0) + (u.brand.heroText ? 2 : 0),
      };
  }
}

// ═══════════════════════════════════════════════════════════
// MATERIAL RESOLVER
// ═══════════════════════════════════════════════════════════

export function toUnifiedMaterial(raw: DomainMaterial): UnifiedMaterial {
  return {
    id: raw.id,
    name: raw.name,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    erp: {
      code: raw.code, category: raw.category, materialType: raw.materialType,
      specification: raw.specification, inventoryUnit: raw.inventoryUnit,
      remaining: raw.remaining, unitCost: raw.unitCost, supplier: raw.supplier,
      status: raw.status,
    },
    brand: {
      alias: raw.alias, type: raw.type, origin: raw.origin,
      description: raw.description, features: raw.features,
      history: raw.history, image: raw.image,
    },
    web: {
      displayName: raw.alias ?? raw.name,
      description: raw.description,
      image: raw.image,
    },
  };
}

export function resolveMaterial(
  system: SystemId,
  raw: DomainMaterial,
): ErpMaterialView | WebMaterialView | BrandMaterialView {
  const u = toUnifiedMaterial(raw);
  const remaining = u.erp.remaining ?? 0;
  switch (system) {
    case "erp":
      return {
        id: u.id, name: u.name, view: "erp",
        code: u.erp.code ?? "", category: u.erp.category ?? "",
        materialType: u.erp.materialType ?? "",
        remaining, unitCost: u.erp.unitCost ?? 0,
        supplier: u.erp.supplier ?? "", inventoryUnit: u.erp.inventoryUnit ?? "",
        stockStatus: remaining > 100 ? "sufficient" : remaining > 0 ? "low" : "out_of_stock",
      };
    case "web":
      return {
        id: u.id, name: u.name, view: "web",
        displayName: u.web.displayName ?? u.name,
        description: u.web.description ?? "",
        image: u.web.image ?? "",
      };
    case "brand":
      return {
        id: u.id, name: u.name, view: "brand",
        alias: u.brand.alias ?? u.name,
        type: u.brand.type ?? "", origin: u.brand.origin ?? "",
        description: u.brand.description ?? "",
        features: u.brand.features ?? "",
        history: u.brand.history ?? "",
        image: u.brand.image ?? "",
      };
  }
}
