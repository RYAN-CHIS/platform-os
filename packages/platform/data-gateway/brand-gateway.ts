/**
 * Brand Gateway — Runtime Implementation (WO-P4A updated)
 *
 * Brand products are now extension-only. Master data comes from ERP.
 * Product display content (story, gallery, presentation) lives in brand_product_content.
 */

import { createPrisma } from "@yunwu/db";

interface BrandGateway {
  series: { list(): Promise<unknown[]> };
  journal: { list(filters?: Record<string,unknown>): Promise<unknown[]>; getBySlug(slug: string): Promise<unknown> };
  content: { getByPage(pageKey: string): Promise<unknown[]> };
  seo: { getByPage(pageKey: string): Promise<unknown> };
  tags: { list(type?: string): Promise<unknown[]> };
  leads: { list(): Promise<unknown[]> };
  media: { list(category?: string): Promise<unknown[]> };
  /** Product content extension — WO-P4A */
  productContent: {
    getByProduct(productId: number): Promise<unknown>;
    getBySku(sku: string): Promise<unknown>;
    upsert(productId: number, data: ProductContentInput): Promise<unknown>;
  };
}

export interface ProductContentInput {
  story?: string;
  gallery?: string;
  presentation?: string;
  seoTitle?: string;
  seoDescription?: string;
  highlights?: string;
}

export function createBrandGateway(databaseUrl: string): BrandGateway {
  const prisma = createPrisma();

  return {
    series: {
      async list() {
        return (prisma as any).brandSeries.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: { products: { include: { extension: true } } },
        });
      },
    },

    journal: {
      async list(filters?: Record<string,unknown>) {
        const where: Record<string, unknown> = {};
        if (filters?.category) where.category = filters.category;
        if (filters?.status) where.status = filters.status;
        return (prisma as any).journalPost.findMany({ where, orderBy: { publishedAt: "desc" }, take: 50 });
      },
      async getBySlug(slug: string) {
        return (prisma as any).journalPost.findUnique({ where: { slug }, include: { journalTags: { include: { tag: true } } } });
      },
    },

    content: {
      async getByPage(pageKey: string) {
        return (prisma as any).pageContent.findMany({ where: { pageKey, published: true }, orderBy: { sortOrder: "asc" } });
      },
    },

    seo: {
      async getByPage(pageKey: string) {
        return (prisma as any).seoConfig.findUnique({ where: { pageKey } });
      },
    },

    tags: {
      async list(type?: string) {
        const where: Record<string, unknown> = {};
        if (type) where.type = type;
        return (prisma as any).brandTag.findMany({ where, orderBy: { name: "asc" } });
      },
    },

    leads: {
      async list() {
        return (prisma as any).contactLead.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
      },
    },

    media: {
      async list(category?: string) {
        const where: Record<string, unknown> = {};
        if (category) where.category = category;
        return (prisma as any).erpMediaAsset.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
      },
    },

    productContent: {
      async getByProduct(productId: number) {
        return (prisma as any).brandProductContent.findUnique({ where: { productId } });
      },
      async getBySku(sku: string) {
        const product = await (prisma as any).brandProduct.findUnique({ where: { sku } });
        if (!product) return null;
        return (prisma as any).brandProductContent.findUnique({ where: { productId: product.id } });
      },
      async upsert(productId: number, data: ProductContentInput) {
        return (prisma as any).brandProductContent.upsert({
          where: { productId },
          create: { productId, ...data },
          update: data,
        });
      },
    },
  };
}
