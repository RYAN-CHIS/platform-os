// ═══════════════════════════════════════════════════════════
// ProductService — 统一产品/器物服务层
//
// 所有系统通过此服务操作 Product，不再直接调用
// prisma.products / prisma.product / prisma.erpProduct
// ═══════════════════════════════════════════════════════════

import type { DomainProduct, DomainListResult } from "./types";

// Prisma-like client interface — 适配任何 legacy schema
interface PrismaLike {
  products?: any;
  product?: any;
  erpProduct?: any;
  brandProduct?: any;
  productSku?: any;
  [key: string]: any;
}

export class ProductService {
  constructor(private prisma: PrismaLike) {}

  /** 自动检测使用哪个底层 model */
  private get model() {
    return (
      this.prisma.products ||      // ERP: model Products
      this.prisma.product ||       // Web: model Product
      this.prisma.erpProduct ||    // Unified: ErpProduct
      this.prisma.brandProduct     // Unified: BrandProduct
    );
  }

  /** 数据行 → DomainProduct */
  private map(row: any): DomainProduct {
    return {
      id: row.id,
      name: row.name,
      status: row.status ?? "draft",
      price: row.price ?? row.salePrice ?? row.costPrice ?? undefined,
      coverImage: row.coverImage ?? row.cover_image ?? undefined,
      description: row.description ?? row.story ?? undefined,
      stock: row.stock ?? row.finishedStock ?? row.finished_stock ?? undefined,
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at,
      // ERP 域
      code: row.code ?? undefined,
      workId: row.workId ?? row.work_id ?? undefined,
      // Brand 域
      slug: row.slug ?? undefined,
      seriesId: row.seriesId ?? row.series_id ?? undefined,
      sku: row.sku ?? undefined,
      objectCategory: row.objectCategory ?? row.object_category ?? undefined,
      theme: row.theme ?? undefined,
      story: row.story ?? undefined,
      materials: row.materials ?? undefined,
      gallery: row.gallery ?? undefined,
      inspiration: row.inspiration ?? undefined,
      keywords: row.keywords ?? undefined,
      lifeStage: row.lifeStage ?? row.life_stage ?? undefined,
      suitableFor: row.suitableFor ?? row.suitable_for ?? undefined,
    };
  }

  async list(params?: {
    keyword?: string;
    status?: string;
    seriesId?: number;
    page?: number;
    pageSize?: number;
  }): Promise<DomainListResult<DomainProduct>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const where: any = {};

    if (params?.keyword) {
      where.OR = [
        { name: { contains: params.keyword } },
        { code: { contains: params.keyword } },
      ];
    }
    if (params?.status) where.status = params.status;
    if (params?.seriesId) where.seriesId = params.seriesId;

    try {
      const [items, total] = await Promise.all([
        this.model.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.model.count({ where }),
      ]);
      return { items: items.map((r: any) => this.map(r)), total };
    } catch {
      return { items: [], total: 0 };
    }
  }

  async getById(id: number): Promise<DomainProduct | null> {
    try {
      const row = await this.model.findUnique({ where: { id } });
      return row ? this.map(row) : null;
    } catch {
      return null;
    }
  }

  async getBySlug(slug: string): Promise<DomainProduct | null> {
    try {
      const row = await this.model.findUnique({ where: { slug } });
      return row ? this.map(row) : null;
    } catch {
      return null;
    }
  }

  async create(data: Partial<DomainProduct>): Promise<DomainProduct | null> {
    try {
      const row = await this.model.create({ data });
      return this.map(row);
    } catch {
      return null;
    }
  }

  async update(id: number, data: Partial<DomainProduct>): Promise<DomainProduct | null> {
    try {
      const row = await this.model.update({ where: { id }, data });
      return this.map(row);
    } catch {
      return null;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      await this.model.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
