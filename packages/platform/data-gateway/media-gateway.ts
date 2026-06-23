/**
 * Media Gateway — ERP MediaAsset + Banner CRUD
 * WO-P6AA: Completes gateway coverage for ERP media module.
 */
import { createPrisma } from "@yunwu/db";

export interface MediaGateway {
  list(filters?: { category?: string; mediaType?: string }): Promise<unknown[]>;
  getById(id: number): Promise<unknown>;
  create(data: MediaInput): Promise<unknown>;
  update(id: number, data: Partial<MediaInput>): Promise<unknown>;
  delete(id: number): Promise<void>;
  banners: {
    list(active?: boolean): Promise<unknown[]>;
    create(data: BannerInput): Promise<unknown>;
    update(id: number, data: Partial<BannerInput>): Promise<unknown>;
    delete(id: number): Promise<void>;
    reorder(ids: number[]): Promise<void>;
  };
}

export interface MediaInput { filename: string; originalName: string; mimeType: string; size: number; url: string; thumbnailUrl?: string; width?: number; height?: number; mediaType?: string; category?: string; alt?: string; caption?: string; tags?: string; uploadedBy?: number; }
export interface BannerInput { title: string; subtitle?: string; mediaId: number; linkUrl?: string; sortOrder?: number; isActive?: boolean; startAt?: string; endAt?: string; }

export function createMediaGateway(databaseUrl: string): MediaGateway {
  const prisma = createPrisma();
  const db = prisma as any;

  return {
    async list(filters) {
      const where: Record<string, unknown> = {};
      if (filters?.category) where.category = filters.category;
      if (filters?.mediaType) where.mediaType = filters.mediaType;
      return db.erpMediaAsset.findMany({ where, orderBy: { createdAt: "desc" } });
    },
    async getById(id) { return db.erpMediaAsset.findUnique({ where: { id }, include: { references: true } }); },
    async create(data) { return db.erpMediaAsset.create({ data }); },
    async update(id, data) { return db.erpMediaAsset.update({ where: { id }, data }); },
    async delete(id) { await db.erpMediaAsset.delete({ where: { id } }); },
    banners: {
      async list(active) { return db.erpBanner.findMany({ where: active ? { isActive: true } : {}, include: { media: true }, orderBy: { sortOrder: "asc" } }); },
      async create(data) { return db.erpBanner.create({ data }); },
      async update(id, data) { return db.erpBanner.update({ where: { id }, data }); },
      async delete(id) { await db.erpBanner.delete({ where: { id } }); },
      async reorder(ids) { for (let i = 0; i < ids.length; i++) { await db.erpBanner.update({ where: { id: ids[i] }, data: { sortOrder: i } }); } },
    },
  };
}
