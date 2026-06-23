"use server";
/** ERP Customers — WO-P7E: Direct Prisma. Zero fetch. */
import { PrismaClient } from "@prisma/client"; import { requirePermission } from "@yunwu/auth/platform-auth"; import { PERMISSIONS } from "@yunwu/platform-core/config/permissions.config"; import { getServerSession } from "next-auth"; import { authOptions } from "@/lib/auth"; import { redirect } from "next/navigation";
const db=new PrismaClient()as any;
async function s(){const x=await getServerSession(authOptions);if(!x?.user)redirect("/platform/login");return x;}
export async function list(filters?:any){const x=await s();await requirePermission(x as any,PERMISSIONS.CUSTOMER_VIEW);const where:any={};if(filters?.keyword){where.OR=[{code:{contains:filters.keyword}},{name:{contains:filters.keyword}}];}return db.erpCustomer.findMany({where,include:{orders:true},orderBy:{createdAt:"desc"}});}
export async function get(id:number){await s();return db.erpCustomer.findUnique({where:{id},include:{orders:{orderBy:{createdAt:"desc"}}}});}
export async function create(d:any){const x=await s();await requirePermission(x as any,PERMISSIONS.CUSTOMER_EDIT);try{return await db.erpCustomer.create({data:d});}catch(e:any){return{error:e.message};}}
export async function update(id:number,d:any){const x=await s();await requirePermission(x as any,PERMISSIONS.CUSTOMER_EDIT);try{await db.erpCustomer.update({where:{id},data:d});return{};}catch(e:any){return{error:e.message};}}
export async function del(id:number){const x=await s();await requirePermission(x as any,PERMISSIONS.CUSTOMER_EDIT);try{await db.erpCustomer.delete({where:{id}});return{};}catch(e:any){return{error:e.message};}}
