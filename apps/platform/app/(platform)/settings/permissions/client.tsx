"use client";
/**
 * Settings Permissions Client — WO-P12D
 * Role × Permission matrix with editable checkboxes + dynamic permission items
 */
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/ActionBar";
import type { RoleRow, PermissionItemRow } from "@/modules/settings/permissions/config";
import { ALL_MODULES } from "@/modules/settings/permissions/config";
import { getPermissionMatrix, savePermissionMatrix } from "@/modules/settings/permissions/actions";
import { createPermissionItem, deletePermissionItem } from "@/modules/settings/permissions/item-actions";

// ── Permission type options ──
const PERM_TYPES = ["查看", "新增", "编辑", "删除", "导出", "审核", "管理"];

// ── Module options for drop-down ──
const MODULE_OPTIONS = [
  { label: "总览", value: "overview" },
  { label: "ERP 系统", value: "erp" },
  { label: "材料管理", value: "erp.materials" },
  { label: "产品 / SKU", value: "erp.products" },
  { label: "BOM 物料清单", value: "erp.bom" },
  { label: "成本核算", value: "erp.costs" },
  { label: "生产记录", value: "erp.production" },
  { label: "库存池", value: "erp.inventory" },
  { label: "销售管理", value: "erp.orders" },
  { label: "客户管理", value: "erp.customers" },
  { label: "采购管理", value: "erp.purchase" },
  { label: "Brand OS", value: "brand" },
  { label: "产品展示", value: "brand.products" },
  { label: "七序系列", value: "brand.series" },
  { label: "材料展示", value: "brand.materials" },
  { label: "品牌志", value: "brand.journal" },
  { label: "媒体素材", value: "brand.media" },
  { label: "Banner 管理", value: "brand.banners" },
  { label: "SEO 设置", value: "brand.seo" },
  { label: "页面设置", value: "brand.settings" },
  { label: "系统设置", value: "settings" },
  { label: "用户管理", value: "settings.users" },
  { label: "角色管理", value: "settings.roles" },
  { label: "权限矩阵", value: "settings.permissions" },
  { label: "审计日志", value: "settings.audit" },
  { label: "系统配置", value: "settings.system" },
];

export default function PermissionsClient({
  initialRoles,
  initialDynamicItems,
}: {
  initialRoles: RoleRow[];
  initialDynamicItems: PermissionItemRow[];
}) {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleRow[]>(initialRoles);
  const [dynamicItems, setDynamicItems] = useState<PermissionItemRow[]>(initialDynamicItems);
  const [matrix, setMatrix] = useState<Record<number, Set<string>>>(() => {
    const m: Record<number, Set<string>> = {};
    for (const r of initialRoles) {
      m[r.id] = new Set(r.permissions || []);
    }
    return m;
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPerm, setNewPerm] = useState({
    name: "",
    code: "",
    module: "settings",
    type: "查看",
    description: "",
  });

  const toggle = (roleId: number, permCode: string) => {
    setMatrix(prev => {
      const next = { ...prev };
      const s = new Set(prev[roleId] || []);
      if (s.has(permCode)) s.delete(permCode);
      else s.add(permCode);
      next[roleId] = s;
      return next;
    });
  };

  const allOn = (roleId: number, domain?: string) => {
    setMatrix(prev => {
      const next = { ...prev };
      const s = new Set(prev[roleId] || []);
      const mods = domain ? ALL_MODULES.filter(m => m.domain === domain) : ALL_MODULES;
      for (const m of mods) s.add(m.code);
      // Also add dynamic items
      for (const item of dynamicItems) s.add(item.code);
      next[roleId] = s;
      return next;
    });
  };

  const allOff = (roleId: number, domain?: string) => {
    setMatrix(prev => {
      const next = { ...prev };
      const s = new Set(prev[roleId] || []);
      const mods = domain ? ALL_MODULES.filter(m => m.domain === domain) : ALL_MODULES;
      for (const m of mods) s.delete(m.code);
      // Also remove dynamic items
      for (const item of dynamicItems) s.delete(item.code);
      next[roleId] = s;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const data = roles.map(r => ({
      roleId: r.id,
      permissions: Array.from(matrix[r.id] || []),
    }));
    const res = await savePermissionMatrix(data);
    if (res.ok) { setMsg("权限矩阵已保存"); router.refresh(); }
    else setMsg("错误: " + res.error);
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!newPerm.name.trim() || !newPerm.code.trim()) {
      setMsg("请填写权限名称和权限代码");
      return;
    }
    setCreating(true);
    const res = await createPermissionItem({
      name: newPerm.name.trim(),
      code: newPerm.code.trim(),
      module: newPerm.module,
      type: newPerm.type,
      description: newPerm.description.trim(),
    });
    if (res.ok) {
      setCreateModalOpen(false);
      setNewPerm({ name: "", code: "", module: "settings", type: "查看", description: "" });
      setMsg("权限项已创建");
      router.refresh();
    } else {
      setMsg("错误: " + res.error);
    }
    setCreating(false);
  };

  const handleDeleteItem = async (item: PermissionItemRow) => {
    if (!confirm(`确定删除权限项「${item.name}」？\n此操作将从所有角色中移除该权限。`)) return;
    const res = await deletePermissionItem(item.id);
    if (res.ok) {
      setMsg("权限项已删除");
      router.refresh();
    } else {
      setMsg("错误: " + res.error);
    }
  };

  const domains = ["ERP", "BRAND", "SETTINGS"];

  // All modules including dynamic items
  const allPermissionCodes = [
    ...ALL_MODULES.map(m => ({ code: m.code, displayName: m.displayName, domain: m.domain, isDynamic: false as const })),
    ...dynamicItems.map(item => ({ code: item.code, displayName: item.name, domain: item.module, isDynamic: true as const })),
  ];

  // Group by domain for display
  const erpModules = ALL_MODULES.filter(m => m.domain === "ERP");
  const brandModules = ALL_MODULES.filter(m => m.domain === "BRAND");
  const settingsModules = ALL_MODULES.filter(m => m.domain === "SETTINGS");

  // Dynamic items by broad module group
  const erpDyn = dynamicItems.filter(i => i.module.startsWith("erp.") || i.module === "erp" || i.module === "overview");
  const brandDyn = dynamicItems.filter(i => i.module.startsWith("brand.") || i.module === "brand");
  const settingsDyn = dynamicItems.filter(i => i.module.startsWith("settings.") || i.module === "settings" || (i.module !== "overview" && !i.module.startsWith("erp") && !i.module.startsWith("brand")));

  const csvData = roles.map(r => ({
    role: r.role_name,
    ...Object.fromEntries(allPermissionCodes.map(m => [m.code, matrix[r.id]?.has(m.code) ? "✓" : "✗"])),
  }));

  const csvColumns = [
    { key: "role", label: "角色" },
    ...allPermissionCodes.map(m => ({ key: m.code, label: m.displayName })),
  ];

  return (
    <div className="max-w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">权限矩阵</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500">{roles.length} 个角色 × {allPermissionCodes.length} 个模块</span>
        </div>
      </div>

      {msg && (
        <div className="mb-4 px-3 py-2 bg-stone-50 border border-stone-200 rounded text-sm text-stone-600">
          {msg}
          <button className="ml-3 text-stone-400 hover:text-stone-600" onClick={() => setMsg("")}>✕</button>
        </div>
      )}

      <ActionBar
        module="settings-permissions"
        csvColumns={csvColumns}
        data={csvData}
        searchPlaceholder="搜索权限..."
        addLabel="+ 新增权限项"
        onAdd={() => setCreateModalOpen(true)}
      />

      {/* Save button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ height: 36, padding: "0 14px", borderRadius: 6, fontSize: 13, cursor: saving ? "wait" : "pointer", background: "#1c1917", color: "#fff", border: "1px solid #1c1917", fontWeight: 400, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "保存中…" : "保存权限矩阵"}
        </button>
      </div>

      {/* Matrix table */}
      <div className="border border-stone-200 rounded overflow-auto bg-white" style={{ maxHeight: "70vh" }}>
        <table className="w-full text-xs" style={{ minWidth: allPermissionCodes.length * 72 + 200 }}>
          <thead>
            <tr className="border-b bg-stone-50 sticky top-0 z-10">
              <th className="text-left py-2 px-3 sticky left-0 bg-stone-50 z-20 min-w-[140px]">模块 \ 角色</th>
              {roles.filter(r => r.is_active).map(r => (
                <th key={r.id} className="text-center py-2 px-2 font-medium text-stone-700 whitespace-nowrap">
                  <div>{r.role_name}</div>
                  <div className="flex gap-1 justify-center mt-1">
                    <button onClick={() => allOn(r.id)} className="text-[10px] text-emerald-600 hover:underline">全选</button>
                    <button onClick={() => allOff(r.id)} className="text-[10px] text-stone-400 hover:underline">清空</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ── ERP Domain ── */}
            <tr className="bg-stone-50">
              <td colSpan={roles.filter(r => r.is_active).length + 1} className="py-1.5 px-3 text-xs font-medium text-stone-500">
                📦 ERP 系统
                <button onClick={() => { for (const r of roles) allOn(r.id, "ERP"); }} className="ml-2 text-[10px] text-emerald-600 hover:underline">全选</button>
                <button onClick={() => { for (const r of roles) allOff(r.id, "ERP"); }} className="ml-1 text-[10px] text-stone-400 hover:underline">清空</button>
              </td>
            </tr>
            {erpModules.map(mod => renderModuleRow(mod.code, mod.displayName, false))}
            {erpDyn.map(item => renderModuleRow(item.code, item.name, true, item.id))}

            {/* ── BRAND Domain ── */}
            <tr className="bg-stone-50">
              <td colSpan={roles.filter(r => r.is_active).length + 1} className="py-1.5 px-3 text-xs font-medium text-stone-500">
                ✨ Brand OS
                <button onClick={() => { for (const r of roles) allOn(r.id, "BRAND"); }} className="ml-2 text-[10px] text-emerald-600 hover:underline">全选</button>
                <button onClick={() => { for (const r of roles) allOff(r.id, "BRAND"); }} className="ml-1 text-[10px] text-stone-400 hover:underline">清空</button>
              </td>
            </tr>
            {brandModules.map(mod => renderModuleRow(mod.code, mod.displayName, false))}
            {brandDyn.map(item => renderModuleRow(item.code, item.name, true, item.id))}

            {/* ── SETTINGS Domain ── */}
            <tr className="bg-stone-50">
              <td colSpan={roles.filter(r => r.is_active).length + 1} className="py-1.5 px-3 text-xs font-medium text-stone-500">
                ⚙️ 系统设置
                <button onClick={() => { for (const r of roles) allOn(r.id, "SETTINGS"); }} className="ml-2 text-[10px] text-emerald-600 hover:underline">全选</button>
                <button onClick={() => { for (const r of roles) allOff(r.id, "SETTINGS"); }} className="ml-1 text-[10px] text-stone-400 hover:underline">清空</button>
              </td>
            </tr>
            {settingsModules.map(mod => renderModuleRow(mod.code, mod.displayName, false))}
            {settingsDyn.map(item => renderModuleRow(item.code, item.name, true, item.id))}
          </tbody>
        </table>
      </div>

      {/* ── Create Permission Item Modal ── */}
      {createModalOpen && (
        <Modal title="新增权限项" onClose={() => setCreateModalOpen(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">权限名称 *</label>
              <input
                type="text" value={newPerm.name}
                onChange={e => setNewPerm(p => ({ ...p, name: e.target.value }))}
                placeholder="如: 报表导出"
                className="w-full h-9 px-3 border border-stone-200 rounded text-sm outline-none focus:border-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">权限代码 *</label>
              <input
                type="text" value={newPerm.code}
                onChange={e => setNewPerm(p => ({ ...p, code: e.target.value }))}
                placeholder="如: erp.reports.export"
                className="w-full h-9 px-3 border border-stone-200 rounded text-sm outline-none focus:border-stone-400"
              />
              <div className="text-[10px] text-stone-400 mt-1">建议格式：模块代码.功能，如 erp.reports.export</div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">所属模块</label>
              <select
                value={newPerm.module}
                onChange={e => setNewPerm(p => ({ ...p, module: e.target.value }))}
                className="w-full h-9 px-3 border border-stone-200 rounded text-sm outline-none focus:border-stone-400 bg-white"
              >
                {MODULE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">权限类型</label>
              <select
                value={newPerm.type}
                onChange={e => setNewPerm(p => ({ ...p, type: e.target.value }))}
                className="w-full h-9 px-3 border border-stone-200 rounded text-sm outline-none focus:border-stone-400 bg-white"
              >
                {PERM_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">描述</label>
              <textarea
                value={newPerm.description}
                onChange={e => setNewPerm(p => ({ ...p, description: e.target.value }))}
                placeholder="权限用途说明"
                rows={2}
                className="w-full px-3 py-2 border border-stone-200 rounded text-sm outline-none focus:border-stone-400 resize-none"
              />
            </div>
            <div className="text-xs text-stone-400">保存后可在下方矩阵中为不同角色勾选此权限</div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreate} disabled={creating}
                style={{ height: 36, padding: "0 16px", borderRadius: 6, fontSize: 13, cursor: creating ? "wait" : "pointer", background: "#1c1917", color: "#fff", border: "none", fontWeight: 400, opacity: creating ? 0.6 : 1 }}
              >
                {creating ? "创建中…" : "创建权限项"}
              </button>
              <button
                type="button" onClick={() => setCreateModalOpen(false)}
                style={{ height: 36, padding: "0 16px", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#fff", color: "#44403c", border: "1px solid #e7e5e4" }}
              >
                取消
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );

  // ── Render a single module/permission row ──
  function renderModuleRow(code: string, displayName: string, isDynamic: boolean, itemId?: number) {
    const activeRoles = roles.filter(r => r.is_active);
    return (
      <tr key={code} className={`border-b border-stone-100 hover:bg-stone-50/30 ${isDynamic ? "bg-amber-50/30" : ""}`}>
        <td className="py-1.5 px-3 sticky left-0 bg-white text-stone-600 flex items-center gap-1.5">
          <span>{displayName}</span>
          {isDynamic && (
            <span className="inline-block px-1 py-0.5 rounded text-[9px] bg-amber-100 text-amber-700 font-medium">自定义</span>
          )}
          {isDynamic && itemId !== undefined && (
            <button
              onClick={() => handleDeleteItem({ id: itemId, name: displayName, code, module: "", type: "", description: "" })}
              className="text-stone-300 hover:text-red-500 ml-1 text-[10px]"
              title="删除此权限项"
            >
              ✕
            </button>
          )}
        </td>
        {activeRoles.map(r => {
          const checked = matrix[r.id]?.has(code);
          return (
            <td key={`${r.id}-${code}`} className="text-center py-1.5 px-2">
              <button
                onClick={() => toggle(r.id, code)}
                style={{
                  width: 28, height: 28,
                  borderRadius: 4,
                  border: checked ? "2px solid #166534" : "2px solid #e7e5e4",
                  background: checked ? "#166534" : "#fff",
                  color: checked ? "#fff" : "transparent",
                  fontSize: 14,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.1s",
                }}
              >
                {checked ? "✓" : ""}
              </button>
            </td>
          );
        })}
      </tr>
    );
  }
}

// ── Shared Modal ──
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f5f5f4" }}>
          <span style={{ fontWeight: 500, fontSize: 15, color: "#1c1917" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#a8a29e", lineHeight: 1, padding: "2px 6px", borderRadius: 4 }}>✕</button>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>{children}</div>
      </div>
    </div>
  );
}
