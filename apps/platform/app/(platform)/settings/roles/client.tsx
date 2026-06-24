"use client";
/**
 * Settings Roles Client — WO-P12D
 */
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/ActionBar";
import type { RoleRow } from "@/modules/settings/roles/actions";
import {
  createRole,
  updateRole,
  deleteRole,
  toggleRoleActive,
  duplicateRole,
} from "@/modules/settings/roles/actions";

export default function RolesClient({ initialRoles }: { initialRoles: RoleRow[] }) {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleRow[]>(initialRoles);
  useEffect(() => { setRoles(initialRoles); }, [initialRoles]);
  const [modal, setModal] = useState<{ type: "create" | "edit" | "perm"; role?: RoleRow } | null>(null);
  const [msg, setMsg] = useState("");

  const refresh = useCallback(() => router.refresh(), [router]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = await createRole({
      roleName: fd.get("roleName") as string,
      roleCode: fd.get("roleCode") as string,
      description: fd.get("description") as string,
    });
    if (r.ok) { setModal(null); refresh(); setMsg("角色创建成功"); }
    else setMsg("错误: " + r.error);
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!modal?.role) return;
    const fd = new FormData(e.currentTarget);
    const r = await updateRole({
      id: modal.role.id,
      roleName: fd.get("roleName") as string,
      roleCode: fd.get("roleCode") as string,
      description: fd.get("description") as string,
    });
    if (r.ok) { setModal(null); refresh(); setMsg("角色更新成功"); }
    else setMsg("错误: " + r.error);
  };

  const handleToggle = async (role: RoleRow) => {
    const r = await toggleRoleActive(role.id, !role.is_active);
    if (r.ok) { refresh(); setMsg(`角色已${!role.is_active ? "启用" : "禁用"}`); }
    else setMsg("错误: " + r.error);
  };

  const handleDelete = async (role: RoleRow) => {
    if (!confirm(`确定删除角色「${role.role_name}」？此操作不可撤销。`)) return;
    const r = await deleteRole(role.id);
    if (r.ok) { refresh(); setMsg("角色已删除"); }
    else setMsg("错误: " + r.error);
  };

  const handleDuplicate = async (role: RoleRow) => {
    const r = await duplicateRole(role.id);
    if (r.ok) { refresh(); setMsg("角色已复制"); }
    else setMsg("错误: " + r.error);
  };

  const csvColumns = [
    { key: "id", label: "ID" },
    { key: "role_name", label: "角色名称" },
    { key: "role_code", label: "代码" },
    { key: "description", label: "描述" },
    { key: "is_active", label: "启用" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">角色管理</h1>
        <span className="text-sm text-stone-500">共 {roles.length} 个角色</span>
      </div>

      {msg && (
        <div className="mb-4 px-3 py-2 bg-stone-50 border border-stone-200 rounded text-sm text-stone-600">
          {msg}
          <button className="ml-3 text-stone-400 hover:text-stone-600" onClick={() => setMsg("")}>✕</button>
        </div>
      )}

      <ActionBar
        module="settings-roles"
        csvColumns={csvColumns}
        data={roles.map(r => ({ ...r, is_active: r.is_active ? "是" : "否" }))}
        searchPlaceholder="搜索角色..."
      />

      <div className="border border-stone-200 rounded overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-stone-50 text-stone-500">
              <th className="text-left py-2 px-3">ID</th>
              <th className="text-left py-2 px-3">角色名称</th>
              <th className="text-left py-2 px-3">代码</th>
              <th className="text-left py-2 px-3">描述</th>
              <th className="text-left py-2 px-3">权限数</th>
              <th className="text-left py-2 px-3">状态</th>
              <th className="text-right py-2 px-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-b border-stone-100 hover:bg-stone-50/50">
                <td className="py-2 px-3 text-stone-400 text-xs">{r.id}</td>
                <td className="py-2 px-3 font-medium">{r.role_name}</td>
                <td className="py-2 px-3 font-mono text-xs text-stone-500">{r.role_code}</td>
                <td className="py-2 px-3 text-stone-500 text-xs max-w-[200px] truncate">{r.description || "—"}</td>
                <td className="py-2 px-3 text-stone-600">{r.permissions?.length || 0}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"}`}>
                    {r.is_active ? "启用" : "禁用"}
                  </span>
                </td>
                <td className="py-2 px-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Btn onClick={() => setModal({ type: "edit", role: r })}>编辑</Btn>
                    <Btn onClick={() => handleDuplicate(r)}>复制</Btn>
                    <Btn onClick={() => handleToggle(r)} variant="warn">
                      {r.is_active ? "禁用" : "启用"}
                    </Btn>
                    <Btn onClick={() => handleDelete(r)} variant="danger">删除</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={() => setModal({ type: "create" })}
          style={{ height: 36, padding: "0 14px", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#1c1917", color: "#fff", border: "1px solid #1c1917", fontWeight: 400 }}
        >
          + 新增角色
        </button>
      </div>

      {/* Create Modal */}
      {modal?.type === "create" && (
        <Modal title="新增角色" onClose={() => setModal(null)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="角色名称" name="roleName" required />
            <Field label="角色代码" name="roleCode" required placeholder="如: Editor" />
            <Field label="描述" name="description" />
            <div className="text-xs text-stone-400">权限在「权限矩阵」页面中配置</div>
            <div className="flex gap-2 pt-2">
              <SubmitBtn>创建角色</SubmitBtn>
              <CancelBtn onClick={() => setModal(null)} />
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {modal?.type === "edit" && modal.role && (
        <Modal title={`编辑角色 — ${modal.role.role_name}`} onClose={() => setModal(null)}>
          <form onSubmit={handleEdit} className="space-y-3">
            <Field label="角色名称" name="roleName" defaultValue={modal.role.role_name} required />
            <Field label="角色代码" name="roleCode" defaultValue={modal.role.role_code} required />
            <Field label="描述" name="description" defaultValue={modal.role.description || ""} />
            <div className="flex gap-2 pt-2">
              <SubmitBtn>保存更改</SubmitBtn>
              <CancelBtn onClick={() => setModal(null)} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Shared UI ──
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f5f5f4" }}>
          <span style={{ fontWeight: 500, fontSize: 15, color: "#1c1917" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#a8a29e" }}>✕</button>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, name, type = "text", defaultValue = "", required = false, placeholder = "" }: { label: string; name: string; type?: string; defaultValue?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-stone-500 mb-1">{label}{required && " *"}</label>
      <input name={name} type={type} defaultValue={defaultValue} required={required} placeholder={placeholder} className="w-full h-9 px-3 border border-stone-200 rounded text-sm outline-none focus:border-stone-400" />
    </div>
  );
}

function SubmitBtn({ children }: { children: React.ReactNode }) {
  return <button type="submit" style={{ height: 36, padding: "0 16px", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#1c1917", color: "#fff", border: "none", fontWeight: 400 }}>{children}</button>;
}

function CancelBtn({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ height: 36, padding: "0 16px", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#fff", color: "#44403c", border: "1px solid #e7e5e4" }}>取消</button>;
}

function Btn({ onClick, children, variant }: { onClick: () => void; children: React.ReactNode; variant?: "warn" | "danger" }) {
  const bg = variant === "danger" ? "#fef2f2" : variant === "warn" ? "#fffbeb" : "#fafaf9";
  const color = variant === "danger" ? "#dc2626" : variant === "warn" ? "#d97706" : "#78716c";
  const border = variant === "danger" ? "#fecaca" : variant === "warn" ? "#fde68a" : "#e7e5e4";
  return (
    <button onClick={onClick} style={{ height: 28, padding: "0 8px", borderRadius: 4, fontSize: 11, cursor: "pointer", background: bg, color, border: `1px solid ${border}` }}>
      {children}
    </button>
  );
}
