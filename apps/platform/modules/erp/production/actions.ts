"use server";
/** ERP Production — WO-P7F: Direct Prisma. Zero fetch. */
import { PrismaClient } from "@prisma/client"; import { requirePermission } from "@yunwu/auth/platform-auth"; import { PERMISSIONS } from "@yunwu/platform-core/config/permissions.config"; import { getServerSession } from "next-auth"; import { authOptions } from "@/lib/auth"; import { redirect } from "next/navigation";
const db=new PrismaClient()as any; async function s(){const x=await getServerSession(authOptions);if(!x?.user)redirect("/platform/login");return x;}
export async function list(skuId?:number){await s();const where:any={};if(skuId)where.skuId=skuId;return db.erpProductionRecord.findMany({where,orderBy:{createdAt:"desc"},include:{sku:true}});}
export async function get(id:number){await s();return db.erpProductionRecord.findUnique({where:{id},include:{sku:{include:{product:true}}}});}
export async function create(d:any){const x=await s();await requirePermission(x as any,PERMISSIONS.PRODUCTION_CREATE);try{return await db.erpProductionRecord.create({data:d});}catch(e:any){return{error:e.message};}}
export async function update(id:number,d:any){const x=await s();await requirePermission(x as any,PERMISSIONS.PRODUCTION_EDIT);try{await db.erpProductionRecord.update({where:{id},data:d});return{};}catch(e:any){return{error:e.message};}}
export async function del(id:number){const x=await s();await requirePermission(x as any,PERMISSIONS.PRODUCTION_EDIT);try{await db.erpProductionRecord.delete({where:{id}});return{};}catch(e:any){return{error:e.message};}}
