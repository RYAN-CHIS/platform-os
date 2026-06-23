"use server";
/**
 * ERP Materials — Server Actions.
 *
 * Dev/CI: Uses fetch() to ERP API (no Prisma build dependency).
 * Production: Switch to MaterialService (see @yunwu/platform/services/erp).
 *
 * WO-P6C-Prime: Service layer extracted at packages/platform/services/erp/materials.service.ts
 * Activation: set ERP_USE_SERVICE_LAYER=true and ensure prisma generate has been run.
 */
import { requirePermission } from "@yunwu/auth/platform-auth";
import { PERMISSIONS } from "@yunwu/platform/config/permissions.config";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { validateMaterialInput } from "./validators";
import type { Material, MaterialFilters } from "./types";

const ERP_BASE = process.env.ERP_API_URL || "http://localhost:3001";

async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/platform/login");
  return session;
}

async function erpFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${ERP_BASE}/api/${path}`, { ...options, cache: "no-store" });
  if (!res.ok) throw new Error(`ERP API error: ${res.status}`);
  return res.json();
}

export async function listMaterials(filters: MaterialFilters): Promise<Material[]> {
  const s = await getSession();
  await requirePermission(s as any, PERMISSIONS.MATERIAL_VIEW);
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.materialType) params.set("materialType", filters.materialType);
  if (filters.keyword) params.set("keyword", filters.keyword);
  return erpFetch(`materials?${params.toString()}`);
}

export async function getMaterial(id: number): Promise<{ material: Material; purchases: any[]; transactions: any[] } | null> {
  const s = await getSession();
  await requirePermission(s as any, PERMISSIONS.MATERIAL_VIEW);
  const material = await erpFetch(`materials/${id}`);
  return material || null;
}

export async function createMaterial(data: Record<string, unknown>): Promise<{ error?: string; material?: Material }> {
  const s = await getSession();
  await requirePermission(s as any, PERMISSIONS.MATERIAL_EDIT);
  try {
    const res = await fetch(`${ERP_BASE}/api/materials`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) return { error: `创建失败: ${res.status}` };
    return { material: await res.json() };
  } catch (e: any) { return { error: e.message }; }
}

export async function updateMaterial(id: number, data: Record<string, unknown>): Promise<{ error?: string }> {
  const s = await getSession();
  await requirePermission(s as any, PERMISSIONS.MATERIAL_EDIT);
  try {
    const res = await fetch(`${ERP_BASE}/api/materials/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) return { error: `更新失败: ${res.status}` };
    return {};
  } catch (e: any) { return { error: e.message }; }
}

export async function deleteMaterial(id: number): Promise<{ error?: string }> {
  const s = await getSession();
  await requirePermission(s as any, PERMISSIONS.MATERIAL_DELETE);
  try {
    const res = await fetch(`${ERP_BASE}/api/materials/${id}`, { method: "DELETE" });
    if (!res.ok) return { error: `删除失败: ${res.status}` };
    return {};
  } catch (e: any) { return { error: e.message }; }
}
