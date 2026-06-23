/** InventoryService — ERP Inventory business logic. WO-P6E. */
import { createPrisma } from "@yunwu/db"; const prisma=createPrisma();const db=prisma as any;

export interface InventoryFilters { materialId?:number;type?:string; }
export interface TransactionInput { materialId:number;type:"IN"|"OUT"|"ADJUST";quantity:number;relatedDoc?:string;remark?:string; }

export const InventoryService = {
  async list(filters:InventoryFilters={}){const where:Record<string,unknown>={};if(filters.materialId)where.materialId=filters.materialId;if(filters.type)where.type=filters.type;return db.erpInventoryTransaction.findMany({where,orderBy:{createdAt:"desc"},take:100});},
  async getById(id:number){return db.erpInventoryTransaction.findUnique({where:{id},include:{material:true}});},
  async getStock(materialId:number){return db.erpMaterial.findUnique({where:{id:materialId},select:{remaining:true,name:true,inventoryUnit:true}});},
  async createTransaction(data:TransactionInput){const mat=await db.erpMaterial.findUnique({where:{id:data.materialId}});if(!mat)throw new Error("材料不存在");const beforeQty=mat.remaining;let afterQty=beforeQty;if(data.type==="IN")afterQty+=data.quantity;else if(data.type==="OUT"){afterQty-=data.quantity;if(afterQty<0)throw new Error("库存不足");}const tx=await db.erpInventoryTransaction.create({data:{...data,beforeQty,afterQty}});await db.erpMaterial.update({where:{id:data.materialId},data:{remaining:afterQty}});return tx;},
  async getMovements(materialId:number){return db.erpInventoryTransaction.findMany({where:{materialId},orderBy:{createdAt:"desc"},take:50,include:{material:true}});},
  async getSummary(){const mats=await db.erpMaterial.findMany({select:{remaining:true,inventoryUnit:true,materialType:true}});return {totalItems:mats.length,lowStock:mats.filter((m:any)=>m.remaining<10).length,byType:Object.entries((mats as any[]).reduce((acc:any,m:any)=>{acc[m.materialType]=(acc[m.materialType]||0)+1;return acc;},{}))};},
};
