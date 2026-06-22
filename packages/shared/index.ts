// ═══════════════════════════════════════════════════════════
// @yunwu/shared — 共享工具函数
// ═══════════════════════════════════════════════════════════

export function formatCurrency(amount: number, currency = "CNY"): string {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateOrderNo(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `YW${y}${m}${d}${h}${min}${s}${rand}`;
}
