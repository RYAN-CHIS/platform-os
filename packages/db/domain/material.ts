// ═══════════════════════════════════════════════════════════
// MaterialService — 统一材料/原料服务层
// ═══════════════════════════════════════════════════════════

import type { DomainMaterial, DomainListResult } from "./types";

interface PrismaLike {
  material?: any;
  rawMaterial?: any;
  erpMaterial?: any;
  brandMaterial?: any;
  [key: string]: any;
}

export class MaterialService {
  constructor(private prisma: PrismaLike) {}

  private get model() {
    return (
      this.prisma.material ||
      this.prisma.rawMaterial ||
      this.prisma.erpMaterial ||
      this.prisma.brandMaterial
    );
  }

  private map(row: any): DomainMaterial {
    return {
      id: row.id,
      name: row.name,
      type: row.type ?? row.materialType ?? row.material_type ?? undefined,
      description: row.description ?? undefined,
      image: row.image ?? undefined,
      status: row.status ?? undefined,
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at,
      // ERP 域
      code: row.code ?? undefined,
      category: row.category ?? undefined,
      materialType: row.materialType ?? row.material_type ?? undefined,
      specification: row.specification ?? undefined,
      inventoryUnit: row.inventoryUnit ?? row.inventory_unit ?? undefined,
      remaining: row.remaining ?? undefined,
      unitCost: row.unitCost ?? row.unit_cost ?? undefined,
      supplier: row.supplier ?? undefined,
      // Brand 域
      alias: row.alias ?? undefined,
      origin: row.origin ?? undefined,
      features: row.features ?? undefined,
      history: row.history ?? undefined,
    };
  }

  async list(params?: {
    keyword?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }): Promise<DomainListResult<DomainMaterial>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const where: any = {};
    if (params?.keyword) {
      where.OR = [
        { name: { contains: params.keyword } },
        { code: { contains: params.keyword } },
      ];
    }
    if (params?.type) where.type = params.type;

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

  async getById(id: number): Promise<DomainMaterial | null> {
    try {
      const row = await this.model.findUnique({ where: { id } });
      return row ? this.map(row) : null;
    } catch {
      return null;
    }
  }
}
