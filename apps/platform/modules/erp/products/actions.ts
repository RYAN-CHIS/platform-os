"use server";
/** ERP Products — Server Actions. WO-P6D: fetch() fallback, service path for production. */
import { requirePermission } from "@yunwu/auth/platform-auth";
import { PERMISSIONS } from "@yunwu/platform/config/permissions.config";
import { getServerSession } from "next-auth"; import { authOptions } from "@/lib/auth"; import { redirect } from "next/navigation";
import type { Product, ProductFilters } from "./types";

const ERP = process.env.ERP_API_URL||"http://localhost:3001";
async function s(){const s=await getServerSession(authOptions);if(!s?.user)redirect("/platform/login");return s;}
async function f(p:string,o?:RequestInit){const r=await fetch(`${ERP}/api/${p}`,{...o,cache:"no-store"});if(!r.ok)throw new Error(`ERP API ${r.status}`);return r.json();}

export async function listProducts(filters:ProductFilters):Promise<Product[]>{const s_=await s();await requirePermission(s_ as any,PERMISSIONS.PRODUCT_VIEW);const p=new URLSearchParams();if(filters.status)p.set("status",filters.status);if(filters.keyword)p.set("keyword",filters.keyword);return f(`products?${p}`);}
export async function getProduct(id:number){await s();return f(`products/${id}`);}
export async function createProduct(d:any){const s_=await s();await requirePermission(s_ as any,PERMISSIONS.PRODUCT_EDIT);const r=await fetch(`${ERP}/api/products`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!r.ok)return{error:`创建失败:${r.status}`};return{product:await r.json()};}
export async function updateProduct(id:number,d:any){const s_=await s();await requirePermission(s_ as any,PERMISSIONS.PRODUCT_EDIT);const r=await fetch(`${ERP}/api/products/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});return r.ok?{}:{error:`更新失败:${r.status}`};}
export async function deleteProduct(id:number){const s_=await s();await requirePermission(s_ as any,PERMISSIONS.PRODUCT_DELETE);const r=await fetch(`${ERP}/api/products/${id}`,{method:"DELETE"});return r.ok?{}:{error:`删除失败:${r.status}`};}
export async function getSkus(productId:number){return f(`sku?productId=${productId}`);}
export async function createSku(d:any){const s_=await s();await requirePermission(s_ as any,PERMISSIONS.SKU_EDIT);const r=await fetch(`${ERP}/api/sku`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});return r.ok?await r.json():{error:`创建失败:${r.status}`};}
