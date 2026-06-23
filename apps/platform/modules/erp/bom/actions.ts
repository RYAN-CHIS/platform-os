"use server";
/** ERP BOM — WO-P7D: Direct Prisma. Zero fetch, zero localhost:3001. */
import { PrismaClient } from "@prisma/client";
import { requirePermission } from "@yunwu/auth/platform-auth";
import { PERMISSIONS } from "@yunwu/platform-core/config/permissions.config";
import { getServerSession } from "next-auth"; import { authOptions } from "@/lib/auth"; import { redirect } from "next/navigation";

const prisma = new PrismaClient(); const db = prisma as any;

async function s(){const x=await getServerSession(authOptions);if(!x?.user)redirect("/platform/login");return x;}

export async function listBom(skuId?:number){await s();const where:any={};if(skuId)where.skuId=skuId;return db.erpBom.findMany({where,include:{material:true,sku:true}});}
export async function getBom(id:number){await s();return db.erpBom.findUnique({where:{id},include:{material:true,sku:{include:{product:true}}}});}
export async function createBom(d:any){const x=await s();await requirePermission(x as any,PERMISSIONS.BOM_EDIT);const mat=await db.erpMaterial.findUnique({where:{id:d.materialId}});try{return await db.erpBom.create({data:{...d,materialCodeSnapshot:mat.code,materialNameSnapshot:mat.name,lineCost:(d.unitPrice||0)*d.quantity}});}catch(e:any){return{error:e.message};}}
export async function updateBom(id:number,d:any){const x=await s();await requirePermission(x as any,PERMISSIONS.BOM_EDIT);const b=await db.erpBom.findUnique({where:{id}});const lineCost=(d.unitPrice??b.unitPrice??0)*(d.quantity??b.quantity);try{await db.erpBom.update({where:{id},data:{...d,lineCost}});return{};}catch(e:any){return{error:e.message};}}
export async function deleteBom(id:number){const x=await s();await requirePermission(x as any,PERMISSIONS.BOM_EDIT);try{await db.erpBom.delete({where:{id}});return{};}catch(e:any){return{error:e.message};}}
