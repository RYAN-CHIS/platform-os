/** ProductService — ERP Products + SKU business logic. WO-P6D. */
import { createPrisma } from "@yunwu/db";
const prisma = createPrisma(); const db = prisma as any;

export interface ProductFilters { status?: string; workId?: number; keyword?: string; }
export interface ProductInput { code: string; name: string; workId: number; status?: string; description?: string; }
export interface SkuInput { code: string; name: string; productId: number; specification?: string; size?: string; price?: number; finishedStock?: number; status?: string; }

export const ProductService = {
  async list(filters: ProductFilters = {}) {
    const where: Record<string,unknown>={};
    if(filters.status) where.status=filters.status;
    if(filters.workId) where.workId=filters.workId;
    if(filters.keyword) where.OR=[{code:{contains:filters.keyword}},{name:{contains:filters.keyword}}];
    return db.erpProduct.findMany({where,include:{skus:{include:{cost:true}},work:{include:{series:true}}},orderBy:{code:"asc"}});
  },
  async getById(id:number){return db.erpProduct.findUnique({where:{id},include:{skus:{include:{cost:true,boms:{include:{material:true}}}},work:{include:{series:true}}}});},
  async create(data:ProductInput){return db.erpProduct.create({data});},
  async update(id:number,data:Partial<ProductInput>){return db.erpProduct.update({where:{id},data});},
  async delete(id:number){await db.erpProduct.delete({where:{id}});},
  async getSkus(productId:number){return db.erpProductSku.findMany({where:{productId},orderBy:{code:"asc"}});},
  async createSku(data:SkuInput){return db.erpProductSku.create({data});},
  async updateSku(id:number,data:Partial<SkuInput>){return db.erpProductSku.update({where:{id},data});},
  async deleteSku(id:number){await db.erpProductSku.delete({where:{id}});},
  async search(q:string){return db.erpProduct.findMany({where:{OR:[{code:{contains:q}},{name:{contains:q}}]},take:10});},
};
