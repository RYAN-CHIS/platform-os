/**
 * Gateway Types — standalone, no circular deps
 *
 * WO-P3A: Extracted from index.ts to break import cycle.
 */

export interface ErpMaterialFilters { category?: string; materialType?: string; status?: string }
export interface ErpProductFilters { status?: string; workId?: number }
export interface ErpOrderFilters { status?: string; customerId?: number; channel?: string }
export interface BrandJournalFilters { category?: string; status?: string }

export interface ErpGateway {
  materials: { list(filters?: ErpMaterialFilters): Promise<unknown[]>; getById(id: number): Promise<unknown>; getInventory(materialId: number): Promise<unknown[]> };
  products: { list(filters?: ErpProductFilters): Promise<unknown[]>; getById(id: number): Promise<unknown>; getSkus(productId: number): Promise<unknown[]> };
  bom: { list(skuId?: number): Promise<unknown[]> };
  inventory: { list(materialId?: number): Promise<unknown[]>; getStock(materialId: number): Promise<unknown> };
  production: { list(skuId?: number): Promise<unknown[]> };
  orders: { list(filters?: ErpOrderFilters): Promise<unknown[]>; getById(id: number): Promise<unknown> };
  customers: { list(filters?: Record<string, unknown>): Promise<unknown[]>; getById(id: number): Promise<unknown> };
  costs: { getBySku(skuId: number): Promise<unknown> };
}

export interface BrandGateway {
  series: { list(): Promise<unknown[]> };
  journal: { list(filters?: BrandJournalFilters): Promise<unknown[]>; getBySlug(slug: string): Promise<unknown> };
  content: { getByPage(pageKey: string): Promise<unknown[]> };
  seo: { getByPage(pageKey: string): Promise<unknown> };
  tags: { list(type?: string): Promise<unknown[]> };
  leads: { list(): Promise<unknown[]> };
  media: { list(category?: string): Promise<unknown[]> };
}

export interface GatewayRegistry {
  erp: ErpGateway;
  brand: BrandGateway;
}
