/**
 * ERP Service Factory — WO-P6F-Pre
 *
 * Activates direct Prisma service when ERP_USE_SERVICE_LAYER=true.
 * Falls back to fetch() → ERP API when false (dev/CI).
 *
 * Production activation:
 *   ERP_USE_SERVICE_LAYER=true  →  Service Layer (direct Prisma)
 *   (default)                   →  fetch() to ERP API :3001
 */
export const USE_SERVICE_LAYER = process.env.ERP_USE_SERVICE_LAYER === "true";
export const ERP_API_URL = process.env.ERP_API_URL || "http://localhost:3001";

/** Type-safe fetch helper */
export async function erpApi(path: string, options?: RequestInit) {
  const res = await fetch(`${ERP_API_URL}/api/${path}`, { ...options, cache: "no-store" });
  if (!res.ok) throw new Error(`ERP API ${res.status}: ${path}`);
  return res.json();
}

/** Attempt to load a service module. Returns null if unavailable. */
export async function tryLoadService<T>(modulePath: string): Promise<T | null> {
  if (!USE_SERVICE_LAYER) return null;
  try {
    const mod = await import(/* webpackIgnore: true */ modulePath);
    return mod as T;
  } catch {
    console.warn(`[ServiceFactory] Cannot load ${modulePath}, falling back to ERP API`);
    return null;
  }
}
