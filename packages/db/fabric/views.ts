// ═══════════════════════════════════════════════════════════
// Data Fabric — View Layer（数据视图层）
//
// 同一份 UnifiedProduct，三个系统看到不同视图：
//   ERP   → 运营视图（inventory, cost, production）
//   Web   → 展示视图（price, image, SEO）
//   Brand → 内容视图（story, emotion, narrative）
// ═══════════════════════════════════════════════════════════

import type { UnifiedProduct, UnifiedSeries, UnifiedMaterial, UnifiedOrder } from "./types.fab";

// ── ERP 运营视图 ──
// 看到：库存、成本、生产、供应商

export type ErpProductView = Pick<
  UnifiedProduct,
  "id" | "name" | "status" | "createdAt" | "updatedAt"
> & {
  view: "erp";
  code?: string;
  workId?: number;
  workName?: string;
  defaultPrice: number;
  finishedStock: number;
  specification: string;
  markupRatio: number;
  rarityLevel: number;
  storyFactor: number;
  skus: { code: string; name: string; price: number; stock: number }[];
  costs: {
    material: number;
    labor: number;
    packaging: number;
    total: number;
  };
  // 库存状态
  stockStatus: "sufficient" | "low" | "out_of_stock";
  // 利润率
  profitMargin: number;
};

// ── Web 展示视图 ──
// 看到：价格、图片、SEO、库存

export type WebProductView = Pick<
  UnifiedProduct,
  "id" | "name" | "status" | "createdAt" | "updatedAt"
> & {
  view: "web";
  slug: string;
  salePrice: number;
  coverImage: string;
  description: string;
  stock: number;
  inStock: boolean;
  seriesName: string;
  objectCategory: string;
  tags: string[];
  seo: {
    title: string;
    description: string;
  };
  gallery: string[];
  // 展示用关联
  relatedProducts?: { id: number; name: string; image: string }[];
};

// ── Brand 内容视图 ──
// 看到：故事、情感、叙事、美学

export type BrandProductView = Pick<
  UnifiedProduct,
  "id" | "name" | "status" | "createdAt" | "updatedAt"
> & {
  view: "brand";
  slug: string;
  seriesName: string;
  objectCategory: string;
  theme: string;
  story: string;
  inspiration: string;
  lifeStage: string;
  keywords: string[];
  materials: string[];
  coverImage: string;
  gallery: string[];
  // 内容元数据
  hasFullStory: boolean;
  contentScore: number; // 0-10 内容完整度
};

// ── Series Views ──

export type ErpSeriesView = Pick<UnifiedSeries, "id" | "name" | "sortOrder"> & {
  view: "erp";
  code: string;
  productCount: number;
};

export type WebSeriesView = Pick<UnifiedSeries, "id" | "name" | "sortOrder"> & {
  view: "web";
  slug: string;
  description: string;
  coverImage: string;
  productCount: number;
};

export type BrandSeriesView = Pick<UnifiedSeries, "id" | "name" | "sortOrder"> & {
  view: "brand";
  slug: string;
  description: string;
  coverImage: string;
  heroText: string;
  longDesc: string;
  contentScore: number;
};

// ── Material Views ──

export type ErpMaterialView = Pick<UnifiedMaterial, "id" | "name"> & {
  view: "erp";
  code: string;
  category: string;
  materialType: string;
  remaining: number;
  unitCost: number;
  supplier: string;
  inventoryUnit: string;
  stockStatus: "sufficient" | "low" | "out_of_stock";
};

export type WebMaterialView = Pick<UnifiedMaterial, "id" | "name"> & {
  view: "web";
  displayName: string;
  description: string;
  image: string;
};

export type BrandMaterialView = Pick<UnifiedMaterial, "id" | "name"> & {
  view: "brand";
  alias: string;
  type: string;
  origin: string;
  description: string;
  features: string;
  history: string;
  image: string;
};

// ── Union types ──

export type ProductView = ErpProductView | WebProductView | BrandProductView;
export type SeriesView = ErpSeriesView | WebSeriesView | BrandSeriesView;
export type MaterialView = ErpMaterialView | WebMaterialView | BrandMaterialView;
