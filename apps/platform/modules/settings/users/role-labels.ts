/**
 * Unified Role Label Map — WO-ROLE-LOCALIZE
 *
 * Maps database role values (English enum keys) to Chinese display labels.
 * Used across: users, roles, permissions, sidebar.
 * Extend this map when adding new roles.
 */

export const ROLE_LABEL_MAP: Record<string, string> = {
  SUPER_ADMIN: "超级管理员",
  ERP_ADMIN: "ERP 管理员",
  BRAND_ADMIN: "品牌管理员",
  WEB_ADMIN: "网站管理员",
  EDITOR: "编辑员",
  OPERATOR: "运营员",
  VIEWER: "查看员",
  // Legacy / lowercase variants
  admin: "管理员",
  super_admin: "超级管理员",
  operator: "运营员",
  viewer: "查看员",
  editor: "编辑员",
};

export const ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "超级管理员" },
  { value: "ERP_ADMIN", label: "ERP 管理员" },
  { value: "BRAND_ADMIN", label: "品牌管理员" },
  { value: "WEB_ADMIN", label: "网站管理员" },
  { value: "EDITOR", label: "编辑员" },
  { value: "OPERATOR", label: "运营员" },
  { value: "VIEWER", label: "查看员" },
];

export const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  ERP_ADMIN: "bg-blue-100 text-blue-700",
  BRAND_ADMIN: "bg-green-100 text-green-700",
  WEB_ADMIN: "bg-purple-100 text-purple-700",
  EDITOR: "bg-amber-100 text-amber-700",
  OPERATOR: "bg-cyan-100 text-cyan-700",
  VIEWER: "bg-stone-100 text-stone-600",
};

export function getRoleLabel(role: string): string {
  return ROLE_LABEL_MAP[role] || role;
}
