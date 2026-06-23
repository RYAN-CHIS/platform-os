"use server";
/** ERP Inventory — WO-P7F: Direct Prisma. Zero fetch. */
import { PrismaClient } from "@prisma/client"; import { requirePermission } from "@yunwu/auth/platform-auth"; import { PERMISSIONS } from "@yunwu/platform-core/config/permissions.config"; import { getServerSession } from "next-auth"; import { authOptions } from "@/lib/auth"; import { redirect } from "next/navigation";
const db=new PrismaClient()as any; async function s(){const x=await getServerSession(authOptions);if(!x?.user)redirect("/platform/login");return x;}
export async function listInventory(materialId?:number){await s();const where:any={};if(materialId)where.materialId=materialId;return db.erpInventoryTransaction.findMany({where,orderBy:{createdAt:"desc"},take:100,include:{material:true}});}
export async function getInventory(id:number){await s();return db.erpInventoryTransaction.findUnique({where:{id},include:{material:true}});}
export async function createTransaction(d:any){const x=await s();await requirePermission(x as any,PERMISSIONS.INVENTORY_EDIT);try{return await db.erpInventoryTransaction.create({data:d});}catch(e:any){return{error:e.message};}}
export async function getStock(materialId:number){await s();return db.erpMaterial.findUnique({where:{id:materialId},select:{remaining:true,name:true,inventoryUnit:true}});}
