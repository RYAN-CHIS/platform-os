/** ProductionService — WO-P6E+ */
import { createPrisma } from "@yunwu/db"; const db=(createPrisma() as any);
export const ProductionService = {
  async list(skuId?:number){const w:any={};if(skuId)w.skuId=skuId;return db.erpProductionRecord.findMany({where:w,orderBy:{createdAt:"desc"},include:{sku:true}});},
  async getById(id:number){return db.erpProductionRecord.findUnique({where:{id},include:{sku:{include:{product:true}}}});},
  async create(data:any){return db.erpProductionRecord.create({data:{skuId:data.skuId,quantity:data.quantity||0,materialCost:data.materialCost||0,laborCost:data.laborCost||0,packagingCost:data.packagingCost||0,totalCost:(data.materialCost||0)+(data.laborCost||0)+(data.packagingCost||0),unitCost:data.quantity?((data.materialCost||0)+(data.laborCost||0)+(data.packagingCost||0))/data.quantity:0,remark:data.remark}});},
  async update(id:number,data:any){const total=(data.materialCost||0)+(data.laborCost||0)+(data.packagingCost||0);return db.erpProductionRecord.update({where:{id},data:{...data,totalCost:total,unitCost:data.quantity?total/data.quantity:0}});},
  async delete(id:number){await db.erpProductionRecord.delete({where:{id}});},
  async getByOrder(){return db.erpProductionRecord.findMany({orderBy:{createdAt:"desc"},take:50});},
  async getBySku(skuId:number){return db.erpProductionRecord.findMany({where:{skuId},orderBy:{createdAt:"desc"}});},
};
