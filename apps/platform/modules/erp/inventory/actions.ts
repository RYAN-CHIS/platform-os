"use server";
import { requirePermission } from "@yunwu/auth/platform-auth"; import { PERMISSIONS } from "@yunwu/platform/config/permissions.config";
import { getServerSession } from "next-auth"; import { authOptions } from "@/lib/auth"; import { redirect } from "next/navigation";
const ERP=process.env.ERP_API_URL||"http://localhost:3001";
async function s(){const s_=await getServerSession(authOptions);if(!s_?.user)redirect("/platform/login");return s_;}
async function f(p:string,o?:RequestInit){const r=await fetch(`${ERP}/api/${p}`,{...o,cache:"no-store"});if(!r.ok)throw new Error(`ERP API ${r.status}`);return r.json();}
export async function listInventory(materialId?:number){await s();const q=materialId?`inventory?materialId=${materialId}`:"inventory";return f(q);}
export async function getInventory(id:number){await s();return f(`inventory/${id}`);}
export async function createTransaction(d:any){const s_=await s();await requirePermission(s_ as any,PERMISSIONS.INVENTORY_EDIT);const r=await fetch(`${ERP}/api/inventory`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});return r.ok?await r.json():{error:`失败:${r.status}`};}
export async function getStock(materialId:number){await s();return f(`materials/${materialId}`);}
