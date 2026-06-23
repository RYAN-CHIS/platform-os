"use server";
/** ERP Orders — WO-P7E: Direct Prisma. Zero fetch. */
import { PrismaClient } from "@prisma/client"; import { requirePermission } from "@yunwu/auth/platform-auth"; import { PERMISSIONS } from "@yunwu/platform-core/config/permissions.config"; import { getServerSession } from "next-auth"; import { authOptions } from "@/lib/auth"; import { redirect } from "next/navigation";
const db=new PrismaClient()as any;
async function s(){const x=await getServerSession(authOptions);if(!x?.user)redirect("/platform/login");return x;}
export async function list(filters?:any){const x=await s();await requirePermission(x as any,PERMISSIONS.ORDER_VIEW);const where:any={};if(filters?.status)where.status=filters.status;if(filters?.customerId)where.customerId=filters.customerId;return db.erpOrder.findMany({where,include:{customer:true},orderBy:{createdAt:"desc"},take:100});}
export async function get(id:number){await s();return db.erpOrder.findUnique({where:{id},include:{customer:true}});}
export async function create(d:any){const x=await s();await requirePermission(x as any,PERMISSIONS.ORDER_EDIT);try{return await db.erpOrder.create({data:d});}catch(e:any){return{error:e.message};}}
export async function update(id:number,d:any){const x=await s();await requirePermission(x as any,PERMISSIONS.ORDER_EDIT);try{await db.erpOrder.update({where:{id},data:d});return{};}catch(e:any){return{error:e.message};}}
export async function del(id:number){const x=await s();await requirePermission(x as any,PERMISSIONS.ORDER_EDIT);try{await db.erpOrder.delete({where:{id}});return{};}catch(e:any){return{error:e.message};}}
