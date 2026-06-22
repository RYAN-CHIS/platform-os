// ═══════════════════════════════════════════════════════════
// Control Plane — Domain Service 访问包装
//
// 将 ProductService / SeriesService / MaterialService
// 的操作包装为受控版本。不修改原有 service 代码。
//
// 使用方式:
//   const guarded = guardProductService(productService, userContext);
//   const { items } = await guarded.list();
// ═══════════════════════════════════════════════════════════

import type { AccessContext } from "./permission";
import type { ModelDomain } from "./system";
import { withReadCheck, withWriteCheck } from "./access";
import type {
  DomainProduct,
  DomainSeries,
  DomainMaterial,
  DomainListResult,
} from "../domain/types";

// ── 受控 Product Service ──
export function guardProductService(
  service: {
    list: (params?: any) => Promise<DomainListResult<DomainProduct>>;
    getById: (id: number) => Promise<DomainProduct | null>;
    getBySlug: (slug: string) => Promise<DomainProduct | null>;
    create: (data: any) => Promise<DomainProduct | null>;
    update: (id: number, data: any) => Promise<DomainProduct | null>;
    delete: (id: number) => Promise<boolean>;
  },
  user: AccessContext,
) {
  return {
    list: (params?: any) =>
      withReadCheck(user, "product", () => service.list(params)),

    getById: (id: number) =>
      withReadCheck(user, "product", () => service.getById(id)),

    getBySlug: (slug: string) =>
      withReadCheck(user, "product", () => service.getBySlug(slug)),

    create: (data: any) =>
      withWriteCheck(user, "product", () => service.create(data)),

    update: (id: number, data: any) =>
      withWriteCheck(user, "product", () => service.update(id, data)),

    delete: (id: number) =>
      withWriteCheck(user, "product", () => service.delete(id)),
  };
}

// ── 受控 Series Service ──
export function guardSeriesService(
  service: {
    list: (params?: any) => Promise<DomainListResult<DomainSeries>>;
    getById: (id: number) => Promise<DomainSeries | null>;
    getBySlug: (slug: string) => Promise<DomainSeries | null>;
  },
  user: AccessContext,
) {
  return {
    list: () =>
      withReadCheck(user, "series", () => service.list()),

    getById: (id: number) =>
      withReadCheck(user, "series", () => service.getById(id)),

    getBySlug: (slug: string) =>
      withReadCheck(user, "series", () => service.getBySlug(slug)),
  };
}

// ── 受控 Material Service ──
export function guardMaterialService(
  service: {
    list: (params?: any) => Promise<DomainListResult<DomainMaterial>>;
    getById: (id: number) => Promise<DomainMaterial | null>;
  },
  user: AccessContext,
) {
  return {
    list: (params?: any) =>
      withReadCheck(user, "material", () => service.list(params)),

    getById: (id: number) =>
      withReadCheck(user, "material", () => service.getById(id)),
  };
}
