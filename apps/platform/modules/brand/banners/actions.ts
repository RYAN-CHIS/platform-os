"use server";

import { brandPrisma } from "@yunwu/db/brand";
import { createCrudAudit, createStatusAudit } from "@/lib/audit";
import { transitionStatus } from "@/lib/publisher";
import { revalidatePath } from "next/cache";

const BANNERS_PATH = "/brand/banners";

function toSnake(s: string) { return s.replace(/[A-Z]/g, m => '_'+m.toLowerCase()); }

export async function listBanners(params?: { status?: string; position?: string; sort?: string; order?: string }) {
  try {
    // 直接读取真实数据库，不做任何状态过滤 —— 确保 DRAFT / IN_REVIEW / APPROVED /
    // SCHEDULED / PUBLISHED / ARCHIVED / REJECTED 等所有状态的 Banner 都进入管理列表。
    let sql = `SELECT * FROM banners WHERE 1=1`;
    const vals: any[] = [];
    if (params?.status) { vals.push(params.status); sql += ` AND status = $${vals.length}`; }
    if (params?.position) { vals.push(params.position); sql += ` AND position = $${vals.length}`; }
    // 排序优先级：sort_order 升序（null 视为 0）；无排序值时按 created_at 倒序
    sql += ` ORDER BY COALESCE(sort_order, 0) ASC, created_at DESC`;
    const rows = await brandPrisma.$queryRawUnsafe<any[]>(sql, ...vals);
    return { rows, total: rows.length, error: null };
  } catch (e: any) { return { rows: [], total: 0, error: e.message }; }
}

export async function createBanner(data: { title: string; subtitle?: string; btn_text?: string; image_url?: string; mobile_image_url?: string; link_url?: string; position?: string; sort_order?: number; status?: string; start_at?: string; end_at?: string }) {
  try {
    const sql = `INSERT INTO banners (title, subtitle, btn_text, image_url, mobile_image_url, link_url, position, sort_order, status, start_at, end_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`;
    const rows = await brandPrisma.$queryRawUnsafe<any[]>(sql,
      data.title, data.subtitle || null, data.btn_text || null, data.image_url || null, data.mobile_image_url || null,
      data.link_url || null, data.position || 'home', data.sort_order || 0, data.status || 'DRAFT', data.start_at || null, data.end_at || null
    );
    try { await createCrudAudit({ action: "CREATE", system: "BRAND", module: "banners", targetId: rows[0].id, after: rows[0] }); } catch {}
    revalidatePath(BANNERS_PATH);
    return { row: rows[0], error: null };
  } catch (e: any) { return { row: null, error: e.message }; }
}

// 仅允许更新 banners 表真实存在的列，防止表单传入多余字段导致 UPDATE 报错
const BANNER_COLUMNS = new Set([
  "title", "subtitle", "btn_text", "image_url", "mobile_image_url", "link_url",
  "position", "sort_order", "status", "start_at", "end_at",
]);

export async function updateBanner(id: number, data: Record<string, unknown>) {
  try {
    const beforeRows = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT * FROM banners WHERE id = $1`, id);
    const before = beforeRows[0] || null;
    const sets: string[] = []; const vals: any[] = [id];
    for (const [k, v] of Object.entries(data)) {
      if (k === 'id') continue;
      const col = toSnake(k);
      if (!BANNER_COLUMNS.has(col)) continue;
      sets.push(`${col} = $${vals.length + 1}`);
      vals.push(v === '' ? null : v);
    }
    if (sets.length === 0) return { row: before, error: null };
    await brandPrisma.$executeRawUnsafe(`UPDATE banners SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1`, ...vals);
    const after = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT * FROM banners WHERE id = $1`, id);
    try { await createCrudAudit({ action: "UPDATE", system: "BRAND", module: "banners", targetId: id, before, after: after[0] }); } catch {}
    revalidatePath(BANNERS_PATH);
    return { row: after[0], error: null };
  } catch (e: any) { return { row: null, error: e.message }; }
}

export async function deleteBanner(id: number) {
  try {
    const beforeRows = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT * FROM banners WHERE id = $1`, id);
    await brandPrisma.$executeRawUnsafe(`DELETE FROM banners WHERE id = $1`, id);
    try { await createCrudAudit({ action: "DELETE", system: "BRAND", module: "banners", targetId: id, before: beforeRows[0] }); } catch {}
    revalidatePath(BANNERS_PATH);
    return { error: null };
  } catch (e: any) { return { error: e.message }; }
}

export async function moveBanner(id: number, direction: "up" | "down") {
  try {
    const rows = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT id, sort_order FROM banners ORDER BY sort_order ASC, id ASC`);
    const idx = rows.findIndex(r => r.id === id);
    if (idx < 0) return { error: "未找到" };
    if (direction === "up" && idx === 0) return { error: "已是第一个" };
    if (direction === "down" && idx === rows.length - 1) return { error: "已是最后一个" };
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    await brandPrisma.$executeRawUnsafe(`UPDATE banners SET sort_order = $1 WHERE id = $2`, rows[swapIdx].sort_order, id);
    await brandPrisma.$executeRawUnsafe(`UPDATE banners SET sort_order = $1 WHERE id = $2`, rows[idx].sort_order, rows[swapIdx].id);
    revalidatePath(BANNERS_PATH);
    return { error: null };
  } catch (e: any) { return { error: e.message }; }
}

// Publishing workflow
export async function publishBanner(id: number) {
  try {
    const result = await transitionStatus("banners", String(id), "PUBLISHED");
    if (!result.success) return { error: result.error };
    const rows = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT * FROM banners WHERE id = $1`, id);
    revalidatePath(BANNERS_PATH);
    return { row: rows[0], error: null };
  } catch (e: any) { return { row: null, error: e.message }; }
}

export async function unpublishBanner(id: number) {
  try {
    const result = await transitionStatus("banners", String(id), "DRAFT");
    if (!result.success) return { error: result.error };
    const rows = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT * FROM banners WHERE id = $1`, id);
    revalidatePath(BANNERS_PATH);
    return { row: rows[0], error: null };
  } catch (e: any) { return { row: null, error: e.message }; }
}
