// ═══════════════════════════════════════════════════════════
// Data Fabric — Unified Data Models
//
// 一个数据实体，统一所有系统的字段。
// 不再有 ErpProduct / BrandProduct / WebProduct 之分。
//
// UnifiedProduct = ERP fields ∪ Brand fields ∪ Web fields
// ═══════════════════════════════════════════════════════════

import type { DomainProduct, DomainSeries, DomainMaterial } from "../domain/types";

// ── Unified Product（全字段超集）──

export interface UnifiedProduct {
  // ── 核心标识（三系统共用）──
  id: number;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;

  // ── ERP 运营视图字段 ──
  erp: {
    code?: string;
    workId?: number;
    workName?: string;
    defaultPrice?: number;
    finishedStock?: number;
    specification?: string;
    markupRatio?: number;
    rarityLevel?: number;
    storyFactor?: number;
    // SKU 聚合
    skus?: { code: string; name: string; price: number; stock: number }[];
    // 成本
    materialCost?: number;
    laborCost?: number;
    packagingCost?: number;
    totalCost?: number;
  };

  // ── Brand 内容视图字段 ──
  brand: {
    slug?: string;
    seriesId?: number;
    seriesName?: string;
    objectCategory?: string;
    theme?: string;
    story?: string;
    inspiration?: string;
    keywords?: string;
    lifeStage?: string;
    suitableFor?: string;
    materials?: string;
    gallery?: string[];
  };

  // ── Web 展示视图字段 ──
  web: {
    salePrice?: number;
    coverImage?: string;
    description?: string;
    stock?: number;
    seoTitle?: string;
    seoDescription?: string;
    tags?: string[];
  };
}

// ── Unified Series（全字段超集）──

export interface UnifiedSeries {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;

  erp: {
    code?: string;
    productCount?: number;
  };

  brand: {
    slug?: string;
    description?: string;
    coverImage?: string;
    heroText?: string;
    longDesc?: string;
    shortDesc?: string;
  };

  web: {
    isActive?: boolean;
    productCount?: number;
    seoTitle?: string;
  };
}

// ── Unified Material（全字段超集）──

export interface UnifiedMaterial {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  erp: {
    code?: string;
    category?: string;
    materialType?: string;
    specification?: string;
    inventoryUnit?: string;
    remaining?: number;
    unitCost?: number;
    supplier?: string;
    status?: string;
    // 库存摘要
    totalPurchased?: number;
    totalUsed?: number;
  };

  brand: {
    alias?: string;
    type?: string;
    origin?: string;
    description?: string;
    features?: string;
    history?: string;
    image?: string;
  };

  web: {
    displayName?: string;
    description?: string;
    image?: string;
  };
}

// ── Unified Order ──

export interface UnifiedOrder {
  id: number;
  orderNo: string;
  status: string;
  amount: number;
  createdAt: Date;

  erp: {
    customerName?: string;
    customerCode?: string;
    channel?: string;
    paymentStatus?: string;
    items?: any;
    shippingAddress?: string;
    deliveryDate?: Date;
    paidAmount?: number;
    discount?: number;
  };

  brand: {
    productName?: string;
    productSlug?: string;
    quantity?: number;
  };

  web: {
    customerName?: string;
    phone?: string;
    address?: string;
    remark?: string;
  };
}
