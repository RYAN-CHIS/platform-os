"use client";
/**
 * Settings Users Client — WO-P12D
 */
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/ActionBar";
import type { UserRow } from "@/modules/settings/users/actions";
import {
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resetUserPassword,
} from "@/modules/settings/users/actions";
import { ROLE_OPTIONS, ROLE_COLORS, getRoleLabel } from "@/modules/settings/users/role-labels";

const STATUS_OPTIONS = ["active", "disabled", "inactive", "suspended"];

const STATUS_LABEL_MAP: Record<string, string> = {
  active: "正常",
  disabled: "已禁用",
  deleted: "已删除",
  inactive: "未激活",
  suspended: "已暂停",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  disabled: "bg-stone-100 text-stone-500",
  inactive: "bg-stone-100 text-stone-500",
  suspended: "bg-orange-100 text-orange-700",
  deleted: "bg-red-100 text-red-500",
};

function getStatusLabel(s: string) { return STATUS_LABEL_MAP[s] || s; }

export default function UsersClient({ initialUsers }: { initialUsers: UserRow[] }) {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  useEffect(() => { setUsers(initialUsers); }, [initialUsers]);
  const [modal, setModal] = useState<{ type: "create" | "edit"; user?: UserRow } | null>(null);
  const [msg, setMsg] = useState("");

  const refresh = useCallback(() => router.refresh(), [router]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = await createUser({
      email: fd.get("email") as string,
      name: fd.get("name") as string,
      password: fd.get("password") as string,
      role: fd.get("role") as string,
      status: fd.get("status") as string,
    });
    if (r.ok) { setModal(null); refresh(); setMsg("用户创建成功"); }
    else setMsg("错误: " + r.error);
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!modal?.user) return;
    const fd = new FormData(e.currentTarget);
    const r = await updateUser({
      id: modal.user.id,
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      role: fd.get("role") as string,
      status: fd.get("status") as string,
    });
    if (r.ok) { setModal(null); refresh(); setMsg("用户更新成功"); }
    else setMsg("错误: " + r.error);
  };

  const handleToggle = async (u: UserRow) => {
    const newStatus = u.status === "active" ? "disabled" : "active";
    const r = await toggleUserStatus(u.id, newStatus);
    if (r.ok) { refresh(); setMsg(`用户已${newStatus === "active" ? "启用" : "禁用"}`); }
    else setMsg("错误: " + r.error);
  };

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`确定删除用户「${u.name || u.email}」？账号会从列表隐藏，权限授权会被清理，审计记录会保留。`)) return;
    const r = await deleteUser(u.id);
    if (r.ok) { refresh(); setMsg(r.message || "用户已删除"); }
    else setMsg("错误: " + r.error);
  };

  const handleResetPwd = async (u: UserRow) => {
    if (!confirm(`确定重置「${u.name || u.email}」的密码？系统将生成临时密码。`)) return;
    const r = await resetUserPassword(u.id);
    if (r.ok && r.tempPassword) {
      setMsg(`✅ 密码已重置！临时密码: ${r.tempPassword}（请立即告知用户修改）`);
    } else {
      setMsg(r.error || "重置失败");
    }
  };

  const csvColumns = [
    { key: "id", label: "ID" },
    { key: "name", label: "姓名" },
    { key: "email", label: "邮箱" },
    { key: "role", label: "角色" },
    { key: "status", label: "状态" },
    { key: "createdAt", label: "注册时间" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">用户管理</h1>
        <span className="text-sm text-stone-500">共 {users.length} 人</span>
      </div>

      {msg && (
        <div className="mb-4 px-3 py-2 bg-stone-50 border border-stone-200 rounded text-sm text-stone-600">
          {msg}
          <button className="ml-3 text-stone-400 hover:text-stone-600" onClick={() => setMsg("")}>✕</button>
        </div>
      )}

      <ActionBar
        module="settings-users"
        csvColumns={csvColumns}
        data={users.map(u => ({ ...u }))}
        searchPlaceholder="搜索用户（邮箱/姓名）..."
        onAdd={() => setModal({ type: "create" })}
        addLabel="+ 新增用户"
      />

      {/* Users Table */}
      <div className="border border-stone-200 rounded overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-stone-50 text-stone-500">
              <th className="text-left py-2 px-3">ID</th>
              <th className="text-left py-2 px-3">姓名</th>
              <th className="text-left py-2 px-3">邮箱</th>
              <th className="text-left py-2 px-3">角色</th>
              <th className="text-left py-2 px-3">状态</th>
              <th className="text-left py-2 px-3">注册时间</th>
              <th className="text-right py-2 px-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-stone-100 hover:bg-stone-50/50">
                <td className="py-2 px-3 text-stone-400 text-xs">{u.id}</td>
                <td className="py-2 px-3 font-medium">{u.name || "—"}</td>
                <td className="py-2 px-3">{u.email}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${ROLE_COLORS[u.role] || "bg-stone-100 text-stone-600"}`}>
                    {getRoleLabel(u.role)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[u.status] || "bg-stone-100 text-stone-600"}`}>
                    {getStatusLabel(u.status)}
                  </span>
                </td>
                <td className="py-2 px-3 text-stone-500 text-xs">
                  {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                </td>
                <td className="py-2 px-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Btn onClick={() => setModal({ type: "edit", user: u })}>编辑</Btn>
                    <Btn onClick={() => handleToggle(u)} variant="warn">
                      {u.status === "active" ? "禁用" : "启用"}
                    </Btn>
                    <Btn onClick={() => handleResetPwd(u)}>重置密码</Btn>
                    <Btn onClick={() => handleDelete(u)} variant="danger">删除</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {modal?.type === "create" && (
        <Modal title="新增用户" onClose={() => setModal(null)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="邮箱" name="email" type="email" required />
            <Field label="姓名" name="name" required />
            <Field label="密码" name="password" type="password" required />
            <select name="role" defaultValue="VIEWER" className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm">
              {ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <Select label="状态" name="status" options={STATUS_OPTIONS} defaultValue="active" labelMap={STATUS_LABEL_MAP} />
            <div className="flex gap-2 pt-2">
              <SubmitBtn>创建用户</SubmitBtn>
              <CancelBtn onClick={() => setModal(null)} />
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {modal?.type === "edit" && modal.user && (
        <Modal title={`编辑用户 — ${modal.user.name || modal.user.email}`} onClose={() => setModal(null)}>
          <form onSubmit={handleEdit} className="space-y-3">
            <Field label="姓名" name="name" defaultValue={modal.user.name || ""} />
            <Field label="邮箱" name="email" type="email" defaultValue={modal.user.email} required />
            <select name="role" defaultValue={modal.user.role} className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm">
              {ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <Select label="状态" name="status" options={STATUS_OPTIONS} defaultValue={modal.user.status} labelMap={STATUS_LABEL_MAP} />
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

function Field({ label, name, type = "text", defaultValue = "", required = false }: { label: string; name: string; type?: string; defaultValue?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs text-stone-500 mb-1">{label}{required && " *"}</label>
      <input name={name} type={type} defaultValue={defaultValue} required={required} className="w-full h-9 px-3 border border-stone-200 rounded text-sm outline-none focus:border-stone-400" />
    </div>
  );
}

function Select({ label, name, options, defaultValue, labelMap }: { label: string; name: string; options: string[]; defaultValue?: string; labelMap?: Record<string, string> }) {
  return (
    <div>
      <label className="block text-xs text-stone-500 mb-1">{label}</label>
      <select name={name} defaultValue={defaultValue} className="w-full h-9 px-3 border border-stone-200 rounded text-sm outline-none focus:border-stone-400 bg-white">
        {options.map(o => <option key={o} value={o}>{labelMap ? (labelMap[o] || o) : o}</option>)}
      </select>
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
