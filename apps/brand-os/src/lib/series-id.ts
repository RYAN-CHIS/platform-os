export type SeriesIdValidationResult =
  | { valid: true; seriesId: number }
  | { valid: false; error: string };

export function validateSeriesId(value: unknown): SeriesIdValidationResult {
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    return { valid: false, error: "缺少 seriesId" };
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return { valid: false, error: "seriesId 必须为正整数" };
  }

  const seriesId = typeof value === "string" ? Number(value.trim()) : value;
  if (!Number.isInteger(seriesId) || seriesId <= 0) {
    return { valid: false, error: "seriesId 必须为正整数" };
  }

  return { valid: true, seriesId };
}
