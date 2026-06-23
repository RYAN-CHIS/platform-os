/** ERP Materials — Validators. WO-P6B. */
import type { MaterialFilters } from "./types";

export function validateMaterialInput(data: Record<string, unknown>): string | null {
  if (!data.code || typeof data.code !== "string") return "材料编码不能为空";
  if (!data.name || typeof data.name !== "string") return "材料名称不能为空";
  if (data.unitCost !== undefined && data.unitCost !== null && (typeof data.unitCost !== "number" || data.unitCost < 0)) return "单价不能为负数";
  if (data.remaining !== undefined && data.remaining !== null && (typeof data.remaining !== "number" || data.remaining < 0)) return "库存不能为负数";
  return null;
}

export function parseFilters(searchParams: URLSearchParams): MaterialFilters {
  return {
    status: searchParams.get("status") || undefined,
    materialType: searchParams.get("materialType") || undefined,
    category: searchParams.get("category") || undefined,
    keyword: searchParams.get("keyword") || undefined,
  };
}
