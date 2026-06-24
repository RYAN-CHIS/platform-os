"use client";
/**
 * Settings Permissions Client — WO-P12D
 * Role × Permission matrix with editable checkboxes
 */
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/ActionBar";
import type { RoleRow } from "@/modules/settings/permissions/config";
import { ALL_MODULES } from "@/modules/settings/permissions/config";
import { getPermissionMatrix, savePermissionMatrix } from "@/modules/settings/permissions/actions";

export default function PermissionsClient({
  initialRoles,
}: {
  initialRoles: RoleRow[];
  modules: typeof ALL_MODULES;
}) {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleRow[]>(initialRoles);
  const [matrix, setMatrix] = useState<Record<number, Set<string>>>(() => {
    const m: Record<number, Set<string>> = {};
    for (const r of initialRoles) {
      m[r.id] = new Set(r.permissions || []);
    }
    return m;
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

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
    const r = await savePermissionMatrix(data);
    if (r.ok) { setMsg("权限矩阵已保存"); router.refresh(); }
    else setMsg("错误: " + r.error);
    setSaving(false);
  };

  const domains = ["ERP", "BRAND", "SETTINGS"];

  const csvData = roles.map(r => ({
    role: r.role_name,
    ...Object.fromEntries(ALL_MODULES.map(m => [m.code, matrix[r.id]?.has(m.code) ? "✓" : "✗"])),
  }));

  const csvColumns = [
    { key: "role", label: "角色" },
    ...ALL_MODULES.map(m => ({ key: m.code, label: m.name })),
  ];

  return (
    <div className="max-w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">权限矩阵</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500">{roles.length} 个角色 × {ALL_MODULES.length} 个模块</span>
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
        <table className="w-full text-xs" style={{ minWidth: ALL_MODULES.length * 72 + 200 }}>
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
            {domains.map(domain => (
              <>
                <tr key={`hdr-${domain}`} className="bg-stone-50">
                  <td colSpan={roles.filter(r => r.is_active).length + 1} className="py-1.5 px-3 text-xs font-medium text-stone-500">
                    {domain === "ERP" ? "📦 ERP 系统" : domain === "BRAND" ? "✨ Brand OS" : "⚙️ 系统设置"}
                    <button onClick={() => { for (const r of roles) allOn(r.id, domain); }} className="ml-2 text-[10px] text-emerald-600 hover:underline">全选</button>
                    <button onClick={() => { for (const r of roles) allOff(r.id, domain); }} className="ml-1 text-[10px] text-stone-400 hover:underline">清空</button>
                  </td>
                </tr>
                {ALL_MODULES.filter(m => m.domain === domain).map(mod => (
                  <tr key={mod.code} className="border-b border-stone-100 hover:bg-stone-50/30">
                    <td className="py-1.5 px-3 sticky left-0 bg-white font-mono text-stone-600">{mod.code}</td>
                    {roles.filter(r => r.is_active).map(r => {
                      const checked = matrix[r.id]?.has(mod.code);
                      return (
                        <td key={`${r.id}-${mod.code}`} className="text-center py-1.5 px-2">
                          <button
                            onClick={() => toggle(r.id, mod.code)}
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
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
