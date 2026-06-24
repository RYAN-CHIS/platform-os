// ═══════════════════════════════════════════════════════════
// Yunwu Domain Model Layer — 统一业务语义
//
// 所有系统使用这些类型，不再直接依赖 Prisma model。
// 底层映射到 ERP/Brand 的 legacy schema，Phase 3 统一。
// ═══════════════════════════════════════════════════════════

// ── Domain: Product（统一产品/器物/作品）──
export interface DomainProduct {
  id: number;
  name: string;
  status: string;
  price?: number;
  coverImage?: string;
  description?: string;
  stock?: number;
  createdAt: Date;
  updatedAt: Date;
  // ERP 域扩展
  code?: string;
  workId?: number;
  // Brand 域扩展
  slug?: string;
  seriesId?: number;
  sku?: string;
  objectCategory?: string;
  theme?: string;
  story?: string;
  materials?: string;
  gallery?: string;
  inspiration?: string;
  keywords?: string;
  lifeStage?: string;
  suitableFor?: string;
  // V2.1 器物履历扩展
  materialOrigin?: string;
  craftMethod?: string;
  completionDate?: string;
  serialNumber?: string;
  creationStory?: string;
  emotionalState?: string;
  companionsCount?: number;
  remainingQuantity?: number;
  // 定价/ERP 域扩展
  specification?: string;
  markupRatio?: number;
  rarityLevel?: number;
  storyFactor?: number;
}

// ── Domain: Series（统一七序/系列）──
export interface DomainSeries {
  id: number;
  name: string;
  description?: string;
  coverImage?: string;
  sortOrder: number;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
  // ERP 域
  code?: string;
  // Brand 域
  slug?: string;
  heroText?: string;
  longDesc?: string;
  shortDesc?: string;
}

// ── Domain: Material（统一材料/原料）──
export interface DomainMaterial {
  id: number;
  name: string;
  type?: string;
  description?: string;
  image?: string;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
  // ERP 域（库存管理）
  code?: string;
  category?: string;
  materialType?: string;
  specification?: string;
  inventoryUnit?: string;
  remaining?: number;
  unitCost?: number;
  supplier?: string;
  // Brand 域（品牌叙事）
  alias?: string;
  origin?: string;
  features?: string;
  history?: string;
}

// ── Domain: Media（统一媒体资产）──
export interface DomainMedia {
  id: number;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  alt?: string;
  category?: string;
  tags?: string;
  createdAt: Date;
}

// ── Domain: Order（统一订单）──
export interface DomainOrder {
  id: number;
  orderNo: string;
  status: string;
  amount: number;
  customerName?: string;
  createdAt: Date;
}

// ── Service result wrapper ──
export interface DomainResult<T> {
  data: T | null;
  error?: string;
}

export interface DomainListResult<T> {
  items: T[];
  total: number;
}
