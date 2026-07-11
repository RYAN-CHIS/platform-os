"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { del } from "@vercel/blob";
import type { ObjectCategory, JournalCategory, MediaCategory, PublishStatus, AdminRole, TagType } from '@prisma/brand-client';

// ═══════════════════════════════════════════════════════
// Auth helpers — 统一 RBAC 校验
// ═══════════════════════════════════════════════════════

/** 获取当前 session，未登录则重定向到登录页 */
async function getAuthSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/admin/login");
  return session;
}

/**
 * 校验当前用户是否拥有指定角色。
 * 未登录 → 重定向 /admin/login
 * 角色不足 → 重定向 /admin（后台首页）
 */
async function requireRole(allowed: ("SUPER_ADMIN" | "ADMIN" | "EDITOR" | "OPERATOR")[]) {
  const session = await getAuthSession();
  const role = (session.user as any).role as string;
  if (!allowed.includes(role as any)) redirect("/admin");
  return session;
}

// ═══════════════════════════════════════════════════════
// 快捷校验函数（按施工单权限矩阵）
// ═══════════════════════════════════════════════════════

/** 所有已登录角色（读取操作通用） */
export async function requireAnyRole() {
  return requireRole(["SUPER_ADMIN", "ADMIN", "EDITOR", "OPERATOR"]);
}

/** SUPER_ADMIN + ADMIN（七序/器物/材料/作品/图片库/SEO 的写操作） */
export async function requireAdmin() {
  return requireRole(["SUPER_ADMIN", "ADMIN"]);
}

/** 仅 SUPER_ADMIN（系统设置 / 用户管理） */
export async function requireSuperAdmin() {
  return requireRole(["SUPER_ADMIN"]);
}

/** 所有已登录角色（品牌志读写，按施工单 EDITOR+OPERATOR 可访问） */
export async function requireContentEditor() {
  return requireRole(["SUPER_ADMIN", "ADMIN", "EDITOR", "OPERATOR"]);
}

/** SUPER_ADMIN + ADMIN + OPERATOR（Leads 查看，按施工单） */
export async function requireLeadsAccess() {
  return requireRole(["SUPER_ADMIN", "ADMIN", "OPERATOR"]);
}

// ═══════════════════════════════════════════════════════
// Series CRUD（SUPER_ADMIN / ADMIN）
// ═══════════════════════════════════════════════════════

export async function getSeries() {
  await requireAdmin();
  return prisma.series.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function createSeries(data: {
  name: string; slug: string; description: string;
  shortDesc?: string; longDesc?: string;
  coverImage?: string; sortOrder?: number; isActive?: boolean;
}) {
  await requireAdmin();
  const s = await prisma.series.create({ data });
  revalidatePath("/admin/series");
  return s;
}

export async function updateSeries(id: number, data: {
  name?: string; slug?: string; description?: string;
  shortDesc?: string; longDesc?: string;
  coverImage?: string; sortOrder?: number; isActive?: boolean;
}) {
  await requireAdmin();
  const s = await prisma.series.update({ where: { id }, data });
  revalidatePath("/admin/series");
  revalidatePath("/");
  return s;
}

export async function deleteSeries(id: number) {
  await requireAdmin();
  await prisma.series.delete({ where: { id } });
  revalidatePath("/admin/series");
}

// ═══════════════════════════════════════════════════════
// ObjectCategory CRUD（SUPER_ADMIN / ADMIN）
// ═══════════════════════════════════════════════════════

export async function getObjectCategories() {
  // ObjectCategory 是 enum，直接返回枚举值
  return [
    { name: "串珠", slug: "bracelet", enumValue: "BRACELET" },
    { name: "香器", slug: "incense", enumValue: "INCENSE" },
    { name: "印章", slug: "seal",     enumValue: "SEAL" },
    { name: "瓷器", slug: "ceramic",  enumValue: "CERAMIC" },
    { name: "珐琅", slug: "enamel",   enumValue: "ENAMEL" },
    { name: "文房", slug: "scholar",  enumValue: "SCHOLAR" },
  ];
}


// ═══════════════════════════════════════════════════════
// Material CRUD（SUPER_ADMIN / ADMIN）
// ═══════════════════════════════════════════════════════

export async function getMaterials() {
  await requireAdmin();
  return prisma.material.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createMaterial(data: {
  name: string; alias?: string; type?: string; origin?: string;
  history?: string; features?: string; description?: string; image?: string;
}) {
  await requireAdmin();
  const m = await prisma.material.create({ data: { ...data, relatedArticles: "[]" } });
  revalidatePath("/admin/materials");
  return m;
}

export async function updateMaterial(id: number, data: {
  name?: string; alias?: string; type?: string; origin?: string;
  history?: string; features?: string; description?: string; image?: string;
}) {
  await requireAdmin();
  const m = await prisma.material.update({ where: { id }, data });
  revalidatePath("/admin/materials");
  return m;
}

export async function deleteMaterial(id: number) {
  await requireAdmin();
  await prisma.material.delete({ where: { id } });
  revalidatePath("/admin/materials");
}

// ═══════════════════════════════════════════════════════
// Product CRUD
// 读取：所有已登录角色（施工单所有角色均可访问作品中心）
// 写操作：SUPER_ADMIN + ADMIN
// ═══════════════════════════════════════════════════════

export async function getProducts() {
  await requireAnyRole();
  return prisma.product.findMany({
    include: { series: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getSeriesForSelect() {
  await requireAnyRole();
  return prisma.series.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getCategoriesForSelect() {
  await requireAnyRole();
  // ObjectCategory 是 enum，直接返回枚举值
  const categories = [
    { enumValue: "BRACELET", name: "串珠" },
    { enumValue: "INCENSE", name: "香器" },
    { enumValue: "SEAL", name: "印章" },
    { enumValue: "CERAMIC", name: "瓷器" },
    { enumValue: "ENAMEL", name: "珐琅" },
    { enumValue: "SCHOLAR", name: "文房" },
  ];
  return categories.map(c => ({ id: c.enumValue, name: c.name }));
}

export async function createProduct(data: {
  sku: string; name: string; slug: string; seriesId: number;
  objectCategory: string; theme?: string; story?: string; materials?: string;
  coverImage?: string; gallery?: string; costPrice?: number; salePrice?: number;
  status?: string;
}) {
  await requireAdmin();
  const p = await prisma.product.create({
    data: {
      ...data,
      objectCategory: data.objectCategory as ObjectCategory,
      gallery: data.gallery || "[]",
      status: data.status || "draft",
    }
  });
  revalidatePath("/admin/products");
  return p;
}

export async function updateProduct(id: number, data: {
  sku?: string; name?: string; slug?: string; seriesId?: number;
  objectCategory?: string; theme?: string; story?: string; materials?: string;
  coverImage?: string; gallery?: string; costPrice?: number; salePrice?: number;
  status?: string;
}) {
  await requireAdmin();
  const updateData: Record<string, any> = {};
  if (data.sku !== undefined) updateData.sku = data.sku;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.seriesId !== undefined) updateData.seriesId = data.seriesId;
  if (data.objectCategory !== undefined) updateData.objectCategory = data.objectCategory as ObjectCategory;
  if (data.theme !== undefined) updateData.theme = data.theme;
  if (data.story !== undefined) updateData.story = data.story;
  if (data.materials !== undefined) updateData.materials = data.materials;
  if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
  if (data.gallery !== undefined) updateData.gallery = data.gallery;
  if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
  if (data.salePrice !== undefined) updateData.salePrice = data.salePrice;
  if (data.status !== undefined) updateData.status = data.status;

  const p = await prisma.product.update({ where: { id }, data: updateData });
  revalidatePath("/admin/products");
  return p;
}

export async function deleteProduct(id: number) {
  await requireAdmin();
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin/products");
}

// ═══════════════════════════════════════════════════════
// Journal CRUD（所有已登录角色，按施工单）
// ═══════════════════════════════════════════════════════

export async function getJournalPosts() {
  await requireContentEditor();
  return prisma.journalPost.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function createJournalPost(data: {
  title: string; slug: string; content: string; excerpt?: string;
  coverImage?: string; category: JournalCategory; status: PublishStatus;
  seoTitle?: string; seoDescription?: string;
}) {
  await requireContentEditor();
  const post = await prisma.journalPost.create({ data });
  revalidatePath("/admin/journal");
  return post;
}

export async function updateJournalPost(id: string, data: {
  title?: string; slug?: string; content?: string; excerpt?: string;
  coverImage?: string; category?: JournalCategory; status?: PublishStatus;
  seoTitle?: string; seoDescription?: string;
}) {
  await requireContentEditor();
  const post = await prisma.journalPost.update({ where: { id }, data });
  revalidatePath("/admin/journal");
  revalidatePath("/journal");
  return post;
}

export async function deleteJournalPost(id: string) {
  await requireContentEditor();
  await prisma.journalPost.delete({ where: { id } });
  revalidatePath("/admin/journal");
}

// ═══════════════════════════════════════════════════════
// Media CRUD（读取：SUPER_ADMIN/ADMIN/EDITOR，删除：SUPER_ADMIN/ADMIN）
// ═══════════════════════════════════════════════════════

export async function getMedia() {
  await requireContentEditor();
  return prisma.media.findMany({ orderBy: { createdAt: "desc" } });
}

export async function saveMedia(data: {
  filename: string; url: string; category: MediaCategory;
  altText?: string; size: number; mimeType: string;
}) {
  await requireContentEditor();
  const m = await prisma.media.create({ data });
  revalidatePath("/admin/media");
  return m;
}

export async function deleteMedia(id: string) {
  await requireAdmin();
  const record = await prisma.media.findUnique({ where: { id } });
  if (record && record.url) {
    try { await del(record.url); } catch {}
  }
  await prisma.media.delete({ where: { id } });
  revalidatePath("/admin/media");
}

// ═══════════════════════════════════════════════════════
// SEO CRUD（SUPER_ADMIN / ADMIN）
// ═══════════════════════════════════════════════════════

export async function getSeoConfigs() {
  await requireAdmin();
  return prisma.seoConfig.findMany({ orderBy: { pageKey: "asc" } });
}

export async function upsertSeoConfig(data: {
  pageKey: string; title: string; description: string;
  ogImage?: string; canonical?: string;
}) {
  await requireAdmin();
  const c = await prisma.seoConfig.upsert({
    where: { pageKey: data.pageKey },
    create: data,
    update: data,
  });
  revalidatePath("/admin/seo");
  return c;
}

// ═══════════════════════════════════════════════════════
// Site Settings（仅 SUPER_ADMIN）
// ═══════════════════════════════════════════════════════

export async function getSiteSettings() {
  await requireSuperAdmin();
  return prisma.siteSetting.findMany();
}

export async function upsertSiteSetting(key: string, value: string) {
  await requireSuperAdmin();
  const s = await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  revalidatePath("/admin/settings");
  return s;
}

export async function getSiteSettingValue(key: string): Promise<string | null> {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key } });
    return setting?.value || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// Leads（SUPER_ADMIN / ADMIN / OPERATOR）
// ═══════════════════════════════════════════════════════

export async function getLeads() {
  await requireLeadsAccess();
  return prisma.contactLead.findMany({ orderBy: { createdAt: "desc" } });
}

// ═══════════════════════════════════════════════════════
// Admin Users（仅 SUPER_ADMIN）
// ═══════════════════════════════════════════════════════

export async function getAdminUsers() {
  await requireSuperAdmin();
  return prisma.adminUser.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createAdminUser(data: {
  email: string; name: string; password: string; role: string;
}) {
  await requireSuperAdmin();
  const hash = await bcrypt.hash(data.password, 10);
  const u = await prisma.adminUser.create({
    data: { email: data.email, name: data.name, passwordHash: hash, role: data.role as any },
  });
  revalidatePath("/admin/settings");
  return u;
}

export async function deleteAdminUser(id: string) {
  await requireSuperAdmin();
  await prisma.adminUser.delete({ where: { id } });
  revalidatePath("/admin/settings");
}
