"use server";
/** ERP Materials — WO-P7D: Direct Prisma. Zero fetch, zero localhost:3001. */
import { PrismaClient } from "@prisma/client";
import { requirePermission } from "@yunwu/auth/platform-auth";
import { PERMISSIONS } from "@yunwu/platform-core/config/permissions.config";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Material, MaterialFilters } from "./types";

const prisma = new PrismaClient(); const db = prisma as any;

async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/platform/login");
  return session;
}

export async function listMaterials(filters: MaterialFilters): Promise<Material[]> {
  const s = await getSession();
  await requirePermission(s as any, PERMISSIONS.MATERIAL_VIEW);
  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (filters.materialType) where.materialType = filters.materialType;
  if (filters.keyword) where.OR = [{ code: { contains: filters.keyword } }, { name: { contains: filters.keyword } }];
  return db.erpMaterial.findMany({ where, orderBy: { code: "asc" } });
}

export async function getMaterial(id: number) {
  const s = await getSession();
  await requirePermission(s as any, PERMISSIONS.MATERIAL_VIEW);
  const m = await db.erpMaterial.findUnique({ where: { id }, include: { purchaseRecords: true, transactions: true } });
  return m || null;
}

export async function createMaterial(data: Record<string, unknown>) {
  const s = await getSession();
  await requirePermission(s as any, PERMISSIONS.MATERIAL_EDIT);
  try { const m = db.erpMaterial ? await db.erpMaterial.create({ data }) : await db.rawMaterial.create({ data }); return { material: m }; }
  catch (e: any) { return { error: e.message }; }
}

export async function updateMaterial(id: number, data: Record<string, unknown>) {
  const s = await getSession();
  await requirePermission(s as any, PERMISSIONS.MATERIAL_EDIT);
  try { db.erpMaterial ? await db.erpMaterial.update({ where: { id }, data }) : await db.rawMaterial.update({ where: { id }, data }); return {}; }
  catch (e: any) { return { error: e.message }; }
}

export async function deleteMaterial(id: number) {
  const s = await getSession();
  await requirePermission(s as any, PERMISSIONS.MATERIAL_DELETE);
  try { db.erpMaterial ? await db.erpMaterial.delete({ where: { id } }) : await db.rawMaterial.delete({ where: { id } }); return {}; }
  catch (e: any) { return { error: e.message }; }
}
