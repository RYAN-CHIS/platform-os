"use server";

import { brandDb } from "@/lib/brand-db";
import { createAuditLog } from "@/lib/audit";
import { SETTING_SECTIONS, BRAND_DEFAULTS } from "./config";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function listSiteSettings() {
  try {
    const rows = await brandDb.siteSetting.findMany({ select: { key: true, value: true } });
    const valueMap = new Map(rows.map((row) => [row.key, row.value]));
    const sections = Object.entries(SETTING_SECTIONS).map(([sectionKey, section]) => ({
      key: sectionKey,
      label: section.label,
      icon: section.icon,
      fields: section.keys.map((setting) => ({ ...setting, value: valueMap.get(setting.key) || BRAND_DEFAULTS[setting.key] || "" })),
    }));
    return { sections, error: null };
  } catch (error) {
    const sections = Object.entries(SETTING_SECTIONS).map(([sectionKey, section]) => ({
      key: sectionKey,
      label: section.label,
      icon: section.icon,
      fields: section.keys.map((setting) => ({ ...setting, value: BRAND_DEFAULTS[setting.key] || "" })),
    }));
    return { sections, error: errorMessage(error) };
  }
}

export async function saveSiteSetting(key: string, value: string) {
  try {
    const before = await brandDb.siteSetting.findUnique({ where: { key }, select: { value: true } });
    await brandDb.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
    try { await createAuditLog({ action: "SYSTEM_CONFIG_UPDATE", system: "BRAND", module: "settings", targetId: key, before: { value: before?.value ?? null }, after: { value } }); } catch {}
    return { error: null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
