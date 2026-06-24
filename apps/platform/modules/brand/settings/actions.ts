"use server";

import { prisma } from "@yunwu/db";
import { createAuditLog } from "@/lib/audit";
import { SETTING_SECTIONS, BRAND_DEFAULTS } from "./config";

export async function listSiteSettings() {
  try {
    const allKeys = Object.values(SETTING_SECTIONS).flatMap(s => s.keys.map(k => k.key));
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT key, value FROM site_settings`);
    const valueMap = new Map(rows.map(r => [r.key, r.value]));

    const sections = Object.entries(SETTING_SECTIONS).map(([sectionKey, section]) => ({
      key: sectionKey,
      label: section.label,
      icon: section.icon,
      fields: section.keys.map(k => ({
        ...k,
        value: valueMap.get(k.key) || BRAND_DEFAULTS[k.key] || "",
      }))
    }));

    return { sections, error: null };
  } catch (e: any) {
    const sections = Object.entries(SETTING_SECTIONS).map(([sectionKey, section]) => ({
      key: sectionKey,
      label: section.label,
      icon: section.icon,
      fields: section.keys.map(k => ({ ...k, value: BRAND_DEFAULTS[k.key] || "" }))
    }));
    return { sections, error: null };
  }
}

export async function saveSiteSetting(key: string, value: string) {
  try {
    const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT value FROM site_settings WHERE key = $1`, key);
    const beforeValue = beforeRows.length > 0 ? beforeRows[0].value : null;

    await prisma.$executeRawUnsafe(`
      INSERT INTO site_settings (id, key, value, updated_at)
      VALUES (gen_random_uuid(), $1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, key, value);

    try { await createAuditLog({ action: "SYSTEM_CONFIG_UPDATE", system: "BRAND", module: "settings", targetId: key, before: { value: beforeValue }, after: { value } }); } catch {}
    return { error: null };
  } catch (e: any) {
    if (e.message.includes("does not exist")) {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS site_settings (
            id TEXT PRIMARY KEY, key VARCHAR(100) UNIQUE NOT NULL, value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        return saveSiteSetting(key, value);
      } catch (e2: any) { return { error: e2.message }; }
    }
    return { error: e.message };
  }
}
