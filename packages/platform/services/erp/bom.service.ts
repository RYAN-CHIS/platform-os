/** BOMService — ERP BOM business logic. WO-P6E. */
import { createPrisma } from "@yunwu/db"; const prisma=createPrisma();const db=prisma as any;

export interface BomFilters { skuId?:number; }
export interface BomInput { skuId:number;materialId:number;quantity:number;unitPrice?:number; }

export const BOMService = {
  async list(filters:BomFilters={}){const where:Record<string,unknown>={};if(filters.skuId)where.skuId=filters.skuId;return db.erpBom.findMany({where,include:{material:true,sku:true},orderBy:{id:"asc"}});},
  async getById(id:number){return db.erpBom.findUnique({where:{id},include:{material:true,sku:{include:{product:true}}}});},
  async create(data:BomInput){const mat=await db.erpMaterial.findUnique({where:{id:data.materialId}});return db.erpBom.create({data:{...data,materialCodeSnapshot:mat.code,materialNameSnapshot:mat.name,lineCost:(data.unitPrice||0)*data.quantity}});},
  async update(id:number,data:Partial<BomInput>){const existing=await db.erpBom.findUnique({where:{id}});if(!existing)throw new Error("BOM不存在");const lineCost=(data.unitPrice??existing.unitPrice??0)*(data.quantity??existing.quantity);return db.erpBom.update({where:{id},data:{...data,lineCost}});},
  async delete(id:number){await db.erpBom.delete({where:{id}});},
  async calculateCost(skuId:number){const items=await db.erpBom.findMany({where:{skuId},include:{material:true}});const totalCost=items.reduce((sum:number,i:any)=>sum+(i.lineCost||0),0);return{items,totalCost,materialCount:items.length};},
  async getMaterials(skuId:number){return db.erpBom.findMany({where:{skuId},include:{material:{select:{code:true,name:true,unitCost:true,inventoryUnit:true}}}});},
};
