// ═══════════════════════════════════════════════════════════
// Canonical Data Core — ProductCore
//
// 唯一事实模型。ProductCore 定义"什么是产品"。
// 所有系统从这里读取，所有写入汇聚到这里。
//
// ProductCore ≠ ERP Product
// ProductCore ≠ Brand Product
// ProductCore = 唯一事实
// ═══════════════════════════════════════════════════════════

import type { SystemId } from "../control/system";

// ── Media reference（产品关联的媒体）──
export interface CoreMediaRef {
  id: number;
  url: string;
  type: "image" | "video";
  alt?: string;
  sortOrder: number;
}

// ── SKU reference ──
export interface CoreSkuRef {
  code: string;
  name: string;
  price: number;
  stock: number;
  specification?: string;
}

// ── ProductCore（唯一事实）──

export interface ProductCore {
  // ── 身份（不可变）──
  /** Canonical ID: "{system}:{id}" */
  cid: string;
  name: string;
  slug: string;

  // ── 业务（可变）──
  price: number;
  cost: number;
  inventory: number;
  status: "draft" | "active" | "archived";

  // ── 分类 ──
  seriesId?: number;
  seriesName?: string;
  category?: string;

  // ── 媒体 ──
  coverImage?: string;
  media: CoreMediaRef[];
  gallery: string[];

  // ── 描述 ──
  description?: string;
  story?: string;

  // ── 来源追踪 ──
  /** 哪些系统贡献了此产品的数据 */
  _sources: SystemId[];
  /** 最后更新来源 */
  _lastSource: SystemId;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

// ── 工厂函数 ──

export function createProductCore(params: {
  cid: string;
  name: string;
  slug?: string;
  price?: number;
  cost?: number;
  inventory?: number;
  status?: ProductCore["status"];
  seriesId?: number;
  seriesName?: string;
  category?: string;
  coverImage?: string;
  media?: CoreMediaRef[];
  gallery?: string[];
  description?: string;
  story?: string;
  source: SystemId;
}): ProductCore {
  return {
    cid: params.cid,
    name: params.name,
    slug: params.slug ?? params.name.toLowerCase().replace(/\s+/g, "-"),
    price: params.price ?? 0,
    cost: params.cost ?? 0,
    inventory: params.inventory ?? 0,
    status: params.status ?? "draft",
    seriesId: params.seriesId,
    seriesName: params.seriesName,
    category: params.category,
    coverImage: params.coverImage,
    media: params.media ?? [],
    gallery: params.gallery ?? [],
    description: params.description,
    story: params.story,
    _sources: [params.source],
    _lastSource: params.source,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * 合并两个 Canonical Product（跨系统数据汇聚）
 */
export function mergeProductCore(a: ProductCore, b: ProductCore): ProductCore {
  return {
    cid: a.cid,         // 保持主 ID
    name: a.name || b.name,
    slug: a.slug || b.slug,
    // 取非零值
    price: a.price || b.price,
    cost: a.cost || b.cost,
    inventory: a.inventory + b.inventory,  // 库存跨系统汇总
    status: a.status === "active" || b.status === "active" ? "active" : a.status,
    seriesId: a.seriesId ?? b.seriesId,
    seriesName: a.seriesName ?? b.seriesName,
    category: a.category ?? b.category,
    coverImage: a.coverImage ?? b.coverImage,
    media: [...a.media, ...b.media],
    gallery: [...new Set([...a.gallery, ...b.gallery])],
    description: a.description ?? b.description,
    story: a.story ?? b.story,
    _sources: [...new Set([...a._sources, ...b._sources])],
    _lastSource: b._lastSource,
    createdAt: a.createdAt < b.createdAt ? a.createdAt : b.createdAt,
    updatedAt: new Date(),
  };
}
