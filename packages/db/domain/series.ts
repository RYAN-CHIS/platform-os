// ═══════════════════════════════════════════════════════════
// SeriesService — 统一七序/系列服务层
// ═══════════════════════════════════════════════════════════

import type { DomainSeries, DomainListResult } from "./types";

interface PrismaLike {
  series?: any;
  erpSeries?: any;
  brandSeries?: any;
  erp_series?: any;
  [key: string]: any;
}

export class SeriesService {
  constructor(private prisma: PrismaLike) {}

  private get model() {
    return (
      this.prisma.series ||
      this.prisma.erpSeries ||
      this.prisma.brandSeries ||
      this.prisma.erp_series
    );
  }

  private map(row: any): DomainSeries {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      coverImage: row.coverImage ?? row.cover_image ?? undefined,
      sortOrder: row.sortOrder ?? row.sort_order ?? 0,
      isActive: row.isActive ?? row.is_active ?? true,
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at,
      code: row.code ?? undefined,
      slug: row.slug ?? undefined,
      heroText: row.heroText ?? row.hero_text ?? undefined,
      longDesc: row.longDesc ?? row.long_desc ?? undefined,
      shortDesc: row.shortDesc ?? row.short_desc ?? undefined,
    };
  }

  async list(): Promise<DomainListResult<DomainSeries>> {
    try {
      const items = await this.model.findMany({
        orderBy: { sortOrder: "asc" },
        where: { isActive: true },
      });
      return { items: items.map((r: any) => this.map(r)), total: items.length };
    } catch {
      // fallback: try without isActive filter
      try {
        const items = await this.model.findMany({ orderBy: { sortOrder: "asc" } });
        return { items: items.map((r: any) => this.map(r)), total: items.length };
      } catch {
        return { items: [], total: 0 };
      }
    }
  }

  async getById(id: number): Promise<DomainSeries | null> {
    try {
      const row = await this.model.findUnique({ where: { id } });
      return row ? this.map(row) : null;
    } catch {
      return null;
    }
  }

  async getBySlug(slug: string): Promise<DomainSeries | null> {
    try {
      const row = await this.model.findUnique({ where: { slug } });
      return row ? this.map(row) : null;
    } catch {
      return null;
    }
  }
}
