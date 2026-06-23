/** CustomerService — WO-P6E+ */
import { createPrisma } from "@yunwu/db"; const db=(createPrisma() as any);
export const CustomerService = {
  async list(filters?:any){return db.erpCustomer.findMany({where:filters||{},orderBy:{createdAt:"desc"},include:{orders:true}});},
  async getById(id:number){return db.erpCustomer.findUnique({where:{id},include:{orders:{orderBy:{createdAt:"desc"}}}});},
  async create(data:any){return db.erpCustomer.create({data:{code:data.code||`CUS-${Date.now()}`,name:data.name,phone:data.phone,email:data.email,wechat:data.wechat,source:data.source,address:data.address,tags:data.tags,notes:data.notes}});},
  async update(id:number,data:any){return db.erpCustomer.update({where:{id},data});},
  async delete(id:number){await db.erpCustomer.delete({where:{id}});},
  async getOrders(customerId:number){return db.erpOrder.findMany({where:{customerId},orderBy:{createdAt:"desc"}});},
  async getProductions(customerId:number){const orders=await db.erpOrder.findMany({where:{customerId},select:{id:true}});const ids=orders.map((o:any)=>o.id);return db.erpProductionRecord.findMany({where:{skuId:{in:ids}},orderBy:{createdAt:"desc"}});},
  async calculateLTV(customerId:number){const orders=await db.erpOrder.findMany({where:{customerId}});const total=orders.reduce((s:number,o:any)=>s+(o.totalAmount||0),0);return{totalOrders:orders.length,totalSpent:total,averageOrderValue:orders.length?total/orders.length:0,firstOrderDate:orders.length?orders[orders.length-1].createdAt:null,lastOrderDate:orders.length?orders[0].createdAt:null};},
};
