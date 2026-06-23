"use server";
import { requirePermission } from "@yunwu/auth/platform-auth"; import { PERMISSIONS } from "@yunwu/platform/config/permissions.config";
import { getServerSession } from "next-auth"; import { authOptions } from "@/lib/auth"; import { redirect } from "next/navigation";
const ERP=process.env.ERP_API_URL||"http://localhost:3001";
async function s(){const s_=await getServerSession(authOptions);if(!s_?.user)redirect("/platform/login");return s_;}
async function f(p:string,o?:RequestInit){const r=await fetch(`${ERP}/api/${p}`,{...o,cache:"no-store"});if(!r.ok)throw new Error(`ERP API ${r.status}`);return r.json();}
export async function listBom(skuId?:number){await s();const q=skuId?`bom?skuId=${skuId}`:"bom";return f(q);}
export async function getBom(id:number){await s();return f(`bom/${id}`);}
export async function createBom(d:any){const s_=await s();await requirePermission(s_ as any,PERMISSIONS.BOM_EDIT);const r=await fetch(`${ERP}/api/bom`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});return r.ok?await r.json():{error:`失败:${r.status}`};}
export async function updateBom(id:number,d:any){const s_=await s();await requirePermission(s_ as any,PERMISSIONS.BOM_EDIT);const r=await fetch(`${ERP}/api/bom/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});return r.ok?{}:{error:`失败:${r.status}`};}
export async function deleteBom(id:number){const s_=await s();await requirePermission(s_ as any,PERMISSIONS.BOM_EDIT);const r=await fetch(`${ERP}/api/bom/${id}`,{method:"DELETE"});return r.ok?{}:{error:`失败:${r.status}`};}
