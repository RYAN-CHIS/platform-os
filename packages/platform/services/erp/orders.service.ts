/** OrderService — WO-P6E+ */
import { createPrisma } from "@yunwu/db"; const db=(createPrisma() as any);
export const OrderService = {
  async list(filters?:any){const w:any={};if(filters?.status)w.status=filters.status;if(filters?.customerId)w.customerId=filters.customerId;return db.erpOrder.findMany({where:w,include:{customer:true},orderBy:{createdAt:"desc"},take:100});},
  async getById(id:number){return db.erpOrder.findUnique({where:{id},include:{customer:true}});},
  async create(data:any){return db.erpOrder.create({data:{orderNo:data.orderNo||`ORD-${Date.now()}`,customerId:data.customerId,channel:data.channel||"MANUAL",status:data.status||"PENDING",items:typeof data.items==="string"?data.items:JSON.stringify(data.items||[]),subtotal:data.subtotal||0,discount:data.discount||0,totalAmount:data.totalAmount||0,paidAmount:data.paidAmount||0,shippingFee:data.shippingFee||0,notes:data.notes}});},
  async update(id:number,data:any){return db.erpOrder.update({where:{id},data});},
  async delete(id:number){await db.erpOrder.delete({where:{id}});},
  async getByCustomer(customerId:number){return db.erpOrder.findMany({where:{customerId},orderBy:{createdAt:"desc"}});},
  async getByStatus(status:string){return db.erpOrder.findMany({where:{status},include:{customer:true},orderBy:{createdAt:"desc"}});},
  async markPaid(id:number){return db.erpOrder.update({where:{id},data:{status:"PAID",paymentStatus:"PAID",paidAmount:db.erpOrder.findUnique({where:{id}}).then((o:any)=>o.totalAmount)}});},
  async markShipped(id:number){return db.erpOrder.update({where:{id},data:{status:"SHIPPED",deliveryDate:new Date()}});},
  async markDelivered(id:number){return db.erpOrder.update({where:{id},data:{status:"DELIVERED"}});},
};
