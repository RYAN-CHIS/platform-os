// ═══════════════════════════════════════════════════════════
// @yunwu/db/domain — Unified Domain Model Layer
//
// 使用方式:
//   import { ProductService, SeriesService, MaterialService } from "@yunwu/db/domain"
//   import type { DomainProduct, DomainSeries, DomainMaterial } from "@yunwu/db/domain"
//
// 规则:
//   ✅ 所有系统使用这些类型和服务
//   ❌ 禁止直接使用 prisma.products / prisma.product
//   ❌ 禁止在 UI 层区分 ErpProduct / BrandProduct
// ═══════════════════════════════════════════════════════════

export { ProductService } from "./product";
export { SeriesService } from "./series";
export { MaterialService } from "./material";

export type {
  DomainProduct,
  DomainSeries,
  DomainMaterial,
  DomainMedia,
  DomainOrder,
  DomainResult,
  DomainListResult,
} from "./types";
