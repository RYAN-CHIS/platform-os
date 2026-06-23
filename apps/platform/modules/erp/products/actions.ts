"use server";
/** ERP Products — WO-P7D: Direct Prisma. Zero fetch, zero localhost:3001. */
import { PrismaClient } from "@prisma/client";
import { requirePermission } from "@yunwu/auth/platform-auth";
import { PERMISSIONS } from "@yunwu/platform-core/config/permissions.config";
import { getServerSession } from "next-auth"; import { authOptions } from "@/lib/auth"; import { redirect } from "next/navigation";
import type { Product, ProductFilters } from "./types";

const prisma = new PrismaClient(); const db = prisma as any;

async function s(){const x=await getServerSession(authOptions);if(!x?.user)redirect("/platform/login");return x;}

export async function listProducts(filters:ProductFilters):Promise<Product[]>{
  const x=await s();await requirePermission(x as any,PERMISSIONS.PRODUCT_VIEW);
  const where:any={};if(filters.status)where.status=filters.status;if(filters.keyword)where.OR=[{code:{contains:filters.keyword}},{name:{contains:filters.keyword}}];
  return db.erpProduct.findMany({where,include:{skus:{include:{cost:true}},work:{include:{series:true}}},orderBy:{code:"asc"}});}
export async function getProduct(id:number){await s();return db.erpProduct.findUnique({where:{id},include:{skus:{include:{cost:true,boms:{include:{material:true}}}},work:{include:{series:true}}}});}
export async function createProduct(d:any){const x=await s();await requirePermission(x as any,PERMISSIONS.PRODUCT_EDIT);try{return{product:await db.erpProduct.create({data:d})};}catch(e:any){return{error:e.message};}}
export async function updateProduct(id:number,d:any){const x=await s();await requirePermission(x as any,PERMISSIONS.PRODUCT_EDIT);try{await db.erpProduct.update({where:{id},data:d});return{};}catch(e:any){return{error:e.message};}}
export async function deleteProduct(id:number){const x=await s();await requirePermission(x as any,PERMISSIONS.PRODUCT_DELETE);try{await db.erpProduct.delete({where:{id}});return{};}catch(e:any){return{error:e.message};}}
export async function getSkus(pId:number){return db.erpProductSku.findMany({where:{productId:pId},orderBy:{code:"asc"}});}
export async function createSku(d:any){const x=await s();await requirePermission(x as any,PERMISSIONS.SKU_EDIT);try{return await db.erpProductSku.create({data:d});}catch(e:any){return{error:e.message};}}
