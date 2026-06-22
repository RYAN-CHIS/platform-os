"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Key,
  Mail,
  Users,
  UserPlus,
  Shield,
  Settings,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Image,
  Lock,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Clock,
  FileText,
  Layers,
} from "lucide-react";
import {
  PERMISSIONS,
  PERMISSION_LABELS,
  PERMISSION_GROUPS,
  ROLE_LABELS,
  normalizeRole,
  type PermissionCode,
} from "@/lib/permissions";
import { useSort } from "@/hooks/useSort";

// ── 类型定义 ──

interface UserData {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
  permissions: string | null;
  createdAt: string;
  updatedAt: string;
  tempPermissionCount?: number;
}

interface TemplateData {
  id: number;
  name: string;
  role: string;
  description: string | null;
  permissionCount: number;
  permissions?: { code: string; name: string; group: string | null }[];
  createdAt: string;
}

interface TempGrantData {
  id: number;
  userId: number;
  userName?: string;
  permission: string;
  permissionName: string;
  grantedAt: string;
  expiresAt: string;
  reason: string | null;
  remainingMinutes: number;
}

interface AuditLogData {
  id: number;
  actor: { id: number; name: string } | null;
  targetUser: { id: number; name?: string };
  action: string;
  actionLabel: string;
  permission: string;
  reason: string | null;
  createdAt: string;
}

// ── 常量 ──

const roleLabels: Record<string, string> = {
  admin: "管理员",
  operator: "运营",
  viewer: "访客",
  staff: "运营",
};

const TEMP_DURATIONS = [
  { label: "5 分钟", seconds: 300 },
  { label: "15 分钟", seconds: 900 },
  { label: "30 分钟", seconds: 1800 },
  { label: "1 小时", seconds: 3600 },
  { label: "2 小时", seconds: 7200 },
  { label: "4 小时", seconds: 14400 },
  { label: "8 小时", seconds: 28800 },
  { label: "24 小时", seconds: 86400 },
];

// ── 主组件 ──

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = normalizeRole((session?.user as any)?.role) === "admin";
  const currentAvatar = (session?.user as any)?.avatar || "";
  const currentName = session?.user?.name || "";

  const [activeTab, setActiveTab] = useState<string>("profile");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── 个人资料 ──
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");

  // ── 修改密码 ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── 修改邮箱 ──
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  // ── 创建用户 ──
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState("operator");

  // ── 用户管理 ──
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // ── 权限管理 (V3) ──
  const [permissionUserId, setPermissionUserId] = useState<number | null>(null);
  const [userPermCodes, setUserPermCodes] = useState<{ code: string; type: string }[]>([]);
  const [permissionsDirty, setPermissionsDirty] = useState(false);

  // ── 模板管理 (V3 新) ──
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templateDetail, setTemplateDetail] = useState<TemplateData | null>(null);

  // ── 临时授权 (V3 新) ──
  const [tempGrants, setTempGrants] = useState<TempGrantData[]>([]);
  const [tempGrantsLoading, setTempGrantsLoading] = useState(false);
  const [tempGrantUserId, setTempGrantUserId] = useState<number | null>(null);
  const [tempGrantPerm, setTempGrantPerm] = useState("");
  const [tempGrantDuration, setTempGrantDuration] = useState(3600);
  const [tempGrantReason, setTempGrantReason] = useState("");

  // ── 审计日志 (V3 新) ──
  const [auditLogs, setAuditLogs] = useState<AuditLogData[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditFilterAction, setAuditFilterAction] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // ── 初始化 ──
  useEffect(() => {
    setProfileName(currentName);
    setProfileAvatar(currentAvatar);
    setAvatarPreview(currentAvatar);
  }, [currentName, currentAvatar]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("加载用户列表失败:", err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && ["users", "permissions", "templates", "temp-grant", "audit-log"].includes(activeTab)) {
      loadUsers();
    }
  }, [isAdmin, activeTab, loadUsers]);

  // ── 模板加载 ──
  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/permissions/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error("加载模板失败:", err);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "templates") loadTemplates();
  }, [activeTab, loadTemplates]);

  // ── 临时授权列表加载 ──
  const loadTempGrants = useCallback(async () => {
    setTempGrantsLoading(true);
    try {
      const res = await fetch("/api/permissions/temp-grant");
      if (res.ok) {
        const data = await res.json();
        setTempGrants(data);
      }
    } catch (err) {
      console.error("加载临时权限失败:", err);
    } finally {
      setTempGrantsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "temp-grant") loadTempGrants();
  }, [activeTab, loadTempGrants]);

  // ── 审计日志加载 ──
  const loadAuditLogs = useCallback(async () => {
    setAuditLogsLoading(true);
    try {
      let url = `/api/permissions/audit-log?page=${auditPage}&limit=30`;
      if (auditFilterAction) url += `&action=${auditFilterAction}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs);
        setAuditTotal(data.pagination.total);
      }
    } catch (err) {
      console.error("加载审计日志失败:", err);
    } finally {
      setAuditLogsLoading(false);
    }
  }, [auditPage, auditFilterAction]);

  useEffect(() => {
    if (activeTab === "audit-log") loadAuditLogs();
  }, [activeTab, loadAuditLogs]);

  // ── 排序 ──
  const { sorted: sortedUsers, sortKey, sortDir, toggleSort } = useSort(users);

  function renderSortTh(label: string, key: string, className = "text-left") {
    const isActive = sortKey === key;
    const icon = isActive
      ? sortDir === "asc"
        ? <ArrowUp size={12} />
        : <ArrowDown size={12} />
      : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;

    const isRight = className.includes("text-right");
    const isCenter = className.includes("text-center");
    const justify = isRight ? "flex-end" : isCenter ? "center" : "flex-start";

    return (
      <th
        className={`p-3 font-medium cursor-pointer select-none hover:bg-[rgba(180,83,9,0.08)] ${className}`}
        style={{ color: isActive ? "#b45309" : "var(--ink-light)" }}
        onClick={() => toggleSort(key)}
        title={`按${label}排序`}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: justify, width: "100%" }}>
          {label}
          <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
        </span>
      </th>
    );
  }

  // ═══════════════════════════════════════════
  // 权限管理 (V3) 处理器
  // ═══════════════════════════════════════════

  const selectPermissionUser = async (user: UserData) => {
    setPermissionUserId(user.id);
    setPermissionsDirty(false);
    try {
      const res = await fetch(`/api/permissions?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setUserPermCodes(data);
      }
    } catch (err) {
      console.error("加载用户权限失败:", err);
    }
  };

  const togglePermission = (code: string) => {
    setUserPermCodes((prev) => {
      const existing = prev.find((p) => p.code === code);
      if (existing) {
        // 切换 REVOKE ↔ 删除（恢复模板默认）
        if (existing.type === "REVOKE") {
          return prev.filter((p) => p.code !== code);
        }
        // GRANT → REVOKE
        return prev.map((p) => p.code === code ? { ...p, type: "REVOKE" } : p);
      }
      // 新增 GRANT
      return [...prev, { code, type: "GRANT" }];
    });
    setPermissionsDirty(true);
  };

  const getPermissionCheckState = (code: string): "checked" | "unchecked" | "revoked" => {
    const entry = userPermCodes.find((p) => p.code === code);
    if (!entry) return "unchecked";
    if (entry.type === "REVOKE") return "revoked";
    return "checked";
  };

  const handleSavePermissions = async () => {
    if (!permissionUserId || !permissionsDirty) return;
    setSubmitting(true);
    try {
      // 计算需要 ADD 和 REMOVE 的权限
      const toAdd = userPermCodes.filter((p) => p.type === "GRANT").map((p) => p.code);
      const toRemove = userPermCodes.filter((p) => p.type === "REVOKE").map((p) => p.code);

      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: permissionUserId, add: toAdd, remove: toRemove }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage("success", "✅ 权限已更新，用户重新登录后生效");
        setPermissionsDirty(false);
        loadUsers();
      } else {
        showMessage("error", data.error || "保存失败");
      }
    } catch {
      showMessage("error", "保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════
  // 模板管理 (V3) 处理器
  // ═══════════════════════════════════════════

  const selectTemplate = async (templateId: number) => {
    setSelectedTemplateId(templateId);
    try {
      const res = await fetch(`/api/permissions/templates?withPermissions=true`);
      if (res.ok) {
        const data = await res.json();
        const tmpl = data.find((t: TemplateData) => t.id === templateId);
        setTemplateDetail(tmpl || null);
      }
    } catch (err) {
      console.error("加载模板详情失败:", err);
    }
  };

  const applyTemplateToUser = async (templateId: number, userId: number) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          // 通过模板权限来重新计算
          applyTemplate: templateId,
        }),
      });
      if (res.ok) {
        showMessage("success", "✅ 模板已应用，用户重新登录后生效");
        loadUsers();
      } else {
        const data = await res.json();
        showMessage("error", data.error || "应用失败");
      }
    } catch {
      showMessage("error", "应用模板失败");
    } finally {
      setSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════
  // 临时授权 (V3) 处理器
  // ═══════════════════════════════════════════

  const handleTempGrant = async () => {
    if (!tempGrantUserId || !tempGrantPerm || !tempGrantDuration) {
      showMessage("error", "请完整填写临时授权信息");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/permissions/temp-grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: tempGrantUserId,
          permission: tempGrantPerm,
          expiresIn: tempGrantDuration,
          reason: tempGrantReason || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage("success", `✅ 临时授权成功，有效期 ${data.tempGrant.remainingMinutes} 分钟`);
        setTempGrantUserId(null);
        setTempGrantPerm("");
        setTempGrantReason("");
        loadTempGrants();
      } else {
        showMessage("error", data.error || "授权失败");
      }
    } catch {
      showMessage("error", "临时授权失败");
    } finally {
      setSubmitting(false);
    }
  };

  const revokeTempGrant = async (id: number) => {
    try {
      const res = await fetch(`/api/permissions/temp-grant?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showMessage("success", "临时权限已撤销");
        loadTempGrants();
      } else {
        const data = await res.json();
        showMessage("error", data.error || "撤销失败");
      }
    } catch {
      showMessage("error", "撤销失败");
    }
  };

  // ═══════════════════════════════════════════
  // 原有处理器 (保持不变)
  // ═══════════════════════════════════════════

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, avatar: profileAvatar }),
      });
      const data = await res.json();
      if (res.ok) showMessage("success", "个人资料已更新，重新登录后生效");
      else showMessage("error", data.error);
    } catch {
      showMessage("error", "更新失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    if (newPassword !== confirmPassword) {
      showMessage("error", "两次密码输入不一致");
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage("success", data.message);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showMessage("error", data.error);
      }
    } catch {
      showMessage("error", "修改失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/update-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, password: emailPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage("success", data.message);
        if (data.message?.includes("重新登录")) setTimeout(() => { window.location.href = "/login"; }, 1500);
        setNewEmail("");
        setEmailPassword("");
      } else {
        showMessage("error", data.error);
      }
    } catch {
      showMessage("error", "修改失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: createEmail, password: createPassword, name: createName, role: createRole }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage("success", `用户 ${data.user.email} 创建成功`);
        setCreateEmail(""); setCreatePassword(""); setCreateName(""); setCreateRole("operator");
        if (activeTab === "users") loadUsers();
      } else {
        showMessage("error", data.error);
      }
    } catch {
      showMessage("error", "创建失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (res.ok) { showMessage("success", "角色已更新"); loadUsers(); }
      else showMessage("error", data.error);
    } catch {
      showMessage("error", "更新失败");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) { showMessage("success", data.message); loadUsers(); setDeleteConfirm(null); }
      else showMessage("error", data.error);
    } catch {
      showMessage("error", "删除失败");
    }
  };

  // ═══════════════════════════════════════════
  // Tab 定义 (V3 新增模板/临时授权/审计)
  // ═══════════════════════════════════════════

  const tabs = [
    { id: "profile", label: "个人资料", icon: User },
    { id: "password", label: "修改密码", icon: Key },
    { id: "email", label: "绑定邮箱", icon: Mail },
    ...(isAdmin
      ? [
          { id: "create", label: "创建用户", icon: UserPlus },
          { id: "users", label: "用户管理", icon: Users },
          { id: "permissions", label: "权限管理", icon: Lock },
          { id: "templates", label: "权限模板", icon: Layers },
          { id: "temp-grant", label: "临时授权", icon: Clock },
          { id: "audit-log", label: "审计日志", icon: FileText },
        ]
      : []),
  ];

  const totalAuditPages = Math.ceil(auditTotal / 30);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Page Title */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}>
            <Settings size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>系统设置</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--ink-light)", marginLeft: 48 }}>
          V3 · 权限产品化 — 管理账号安全、用户权限、模板与审计
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1.5 shadow-sm border border-[var(--border)] flex-wrap">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMessage(null); setDeleteConfirm(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? "#f0e6d8" : "transparent",
              color: activeTab === tab.id ? "#b45309" : "var(--ink-light)",
            }}>
            <tab.icon size={16} />{tab.label}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-[var(--border)] p-8">

        {/* ─── 个人资料 ─── */}
        {activeTab === "profile" && (
          <form onSubmit={handleUpdateProfile} className="max-w-md space-y-5">
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--ink)" }}>个人资料</h2>
            <p className="text-sm mb-4" style={{ color: "var(--ink-light)" }}>当前账号：{session?.user?.email}</p>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink)" }}>头像</label>
              <div className="flex items-center gap-4 mb-2">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="头像预览" className="w-16 h-16 rounded-xl object-cover border" style={{ borderColor: "var(--border)" }} onError={() => setAvatarPreview("")} />
                ) : (
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-semibold text-white" style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}>
                    {(session?.user?.name || session?.user?.email || "A").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <input type="url" value={profileAvatar} onChange={(e) => { setProfileAvatar(e.target.value); setAvatarPreview(e.target.value); }}
                className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none"
                style={{ borderColor: "var(--border)", background: "#faf8f5" }} placeholder="输入头像图片 URL"
                onFocus={(e) => (e.target.style.borderColor = "#b45309")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              <p className="text-xs mt-1" style={{ color: "var(--ink-light)" }}>粘贴图片链接作为头像</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink)" }}>用户名</label>
              <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none"
                style={{ borderColor: "var(--border)", background: "#faf8f5" }} placeholder="请输入用户名"
                onFocus={(e) => (e.target.style.borderColor = "#b45309")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            </div>
            <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}>
              {submitting ? "保存中…" : "保存资料"}
            </button>
          </form>
        )}

        {/* ─── 修改密码 ─── */}
        {activeTab === "password" && (
          <form onSubmit={handleChangePassword} className="max-w-md space-y-5">
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--ink)" }}>修改登录密码</h2>
            <p className="text-sm mb-4" style={{ color: "var(--ink-light)" }}>当前账号：{session?.user?.email}</p>
            {[{ label: "当前密码", val: currentPassword, set: setCurrentPassword, ph: "请输入当前密码" },
              { label: "新密码", val: newPassword, set: setNewPassword, ph: "至少6位" },
              { label: "确认新密码", val: confirmPassword, set: setConfirmPassword, ph: "再次输入新密码" }].map((f) => (
              <div key={f.label}>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink)" }}>{f.label}</label>
                <input type="password" value={f.val} onChange={(e) => f.set(e.target.value)} required minLength={6}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none"
                  style={{ borderColor: "var(--border)", background: "#faf8f5" }} placeholder={f.ph}
                  onFocus={(e) => (e.target.style.borderColor = "#b45309")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              </div>
            ))}
            <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}>
              {submitting ? "保存中…" : "更新密码"}
            </button>
          </form>
        )}

        {/* ─── 绑定邮箱 ─── */}
        {activeTab === "email" && (
          <form onSubmit={handleUpdateEmail} className="max-w-md space-y-5">
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--ink)" }}>修改绑定邮箱</h2>
            <p className="text-sm mb-4" style={{ color: "var(--ink-light)" }}>当前邮箱：{session?.user?.email}</p>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink)" }}>新邮箱地址</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none"
                style={{ borderColor: "var(--border)", background: "#faf8f5" }} placeholder="请输入新邮箱"
                onFocus={(e) => (e.target.style.borderColor = "#b45309")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink)" }}>当前密码（验证身份）</label>
              <input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none"
                style={{ borderColor: "var(--border)", background: "#faf8f5" }} placeholder="请输入密码确认身份"
                onFocus={(e) => (e.target.style.borderColor = "#b45309")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            </div>
            <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}>
              {submitting ? "保存中…" : "更新邮箱"}
            </button>
          </form>
        )}

        {/* ─── 创建用户 ─── */}
        {activeTab === "create" && (
          <form onSubmit={handleCreateUser} className="max-w-md space-y-5">
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--ink)" }}>创建新用户</h2>
            <p className="text-sm mb-4" style={{ color: "var(--ink-light)" }}>为新成员创建系统账号</p>
            {[{ label: "邮箱 *", val: createEmail, set: setCreateEmail, type: "email", ph: "请输入邮箱" },
              { label: "姓名", val: createName, set: setCreateName, type: "text", ph: "选填" },
              { label: "初始密码 *", val: createPassword, set: setCreatePassword, type: "password", ph: "至少6位" }].map((f) => (
              <div key={f.label}>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink)" }}>{f.label}</label>
                <input type={f.type} value={f.val} onChange={(e) => f.set(e.target.value)} required={f.label.includes("*")} minLength={f.type === "password" ? 6 : undefined}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none"
                  style={{ borderColor: "var(--border)", background: "#faf8f5" }} placeholder={f.ph}
                  onFocus={(e) => (e.target.style.borderColor = "#b45309")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink)" }}>角色</label>
              <div className="flex gap-2">
                {["admin", "operator", "viewer"].map((r) => (
                  <button key={r} type="button" onClick={() => setCreateRole(r)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all border"
                    style={{ background: createRole === r ? "#f0e6d8" : "white", color: createRole === r ? "#b45309" : "var(--ink-light)", borderColor: createRole === r ? "#b45309" : "var(--border)" }}>
                    {roleLabels[r]}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}>
              {submitting ? "创建中…" : "创建用户"}
            </button>
          </form>
        )}

        {/* ─── 用户管理 ─── */}
        {activeTab === "users" && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--ink)" }}>用户管理</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ink-light)" }}>管理系统中的所有用户账号</p>
            {usersLoading ? <p className="text-sm text-center py-8" style={{ color: "var(--ink-light)" }}>加载中…</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#faf8f5", borderBottom: "1px solid var(--border)" }}>
                      {renderSortTh("用户", "name", "text-left")}
                      {renderSortTh("角色", "role", "text-left")}
                      <th className="text-center p-3 font-medium" style={{ color: "var(--ink-light)" }}>临时权限</th>
                      {renderSortTh("创建时间", "createdAt", "text-left")}
                      <th className="text-right p-3 font-medium" style={{ color: "var(--ink-light)" }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((user) => (
                      <tr key={user.id} style={{ borderBottom: "1px solid #f0ebe0" }} className="hover:bg-[#faf8f5] transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {user.avatar ? (
                              <img src={user.avatar} alt="头像" className="w-8 h-8 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                                style={{ background: user.role === "admin" ? "linear-gradient(135deg, #b45309, #92400e)" : user.role === "operator" ? "linear-gradient(135deg, #6b7280, #4b5563)" : "linear-gradient(135deg, #9ca3af, #d1d5db)" }}>
                                {user.role === "admin" ? <Shield size={14} /> : (user.name || user.email || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-medium" style={{ color: "var(--ink)" }}>{user.name || "未命名"}</p>
                              <p className="text-xs" style={{ color: "var(--ink-light)" }}>{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="text-xs px-2 py-1 rounded-md border"
                            style={{ borderColor: "var(--border)", background: "#faf8f5", color: "var(--ink)" }}>
                            <option value="admin">管理员</option>
                            <option value="operator">运营</option>
                            <option value="viewer">访客</option>
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          {(user.tempPermissionCount || 0) > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#fef3c7", color: "#d97706" }}>
                              {user.tempPermissionCount} 项
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-xs" style={{ color: "var(--ink-light)" }}>
                          {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                        </td>
                        <td className="p-3 text-right">
                          {deleteConfirm === user.id ? (
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-xs text-red-600 mr-1">确认删除？</span>
                              <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100">
                                <CheckCircle size={14} />
                              </button>
                              <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-md bg-gray-50 text-gray-500 hover:bg-gray-100">
                                <XCircle size={14} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(user.id)} className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600" title="删除用户">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {sortedUsers.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-sm" style={{ color: "var(--ink-light)" }}>暂无用户数据</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── 权限管理 V3 ─── */}
        {activeTab === "permissions" && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--ink)" }}>权限管理 (V3)</h2>
            <p className="text-sm mb-1" style={{ color: "var(--ink-light)" }}>为每个用户配置权限点。勾选 = 授予，无勾选 = 模板默认，红色 = 已撤销。</p>
            <p className="text-xs mb-4" style={{ color: "#d97706" }}>⚠ 权限变更需用户重新登录后生效</p>

            <div className="flex gap-6">
              {/* 用户列表 */}
              <div className="w-56 flex-shrink-0">
                <h3 className="text-xs font-medium mb-2" style={{ color: "var(--ink-light)" }}>选择用户</h3>
                {usersLoading ? <p className="text-xs" style={{ color: "var(--ink-light)" }}>加载中…</p> : (
                  <div className="space-y-1">
                    {users.map((user) => (
                      <button key={user.id} onClick={() => selectPermissionUser(user)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
                        style={{ background: permissionUserId === user.id ? "#f0e6d8" : "transparent", color: permissionUserId === user.id ? "#b45309" : "var(--ink)" }}>
                        <span className="block font-medium truncate">{user.name || user.email}</span>
                        <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                          {roleLabels[user.role] || user.role}
                          {user.role === "admin" && <span className="ml-1">(全部权限)</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 权限编辑区 */}
              <div className="flex-1" style={{ borderLeft: "1px solid var(--border)", paddingLeft: 24 }}>
                {!permissionUserId ? (
                  <div className="text-center py-12" style={{ color: "var(--ink-light)" }}>
                    <Lock size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">请从左侧选择要管理权限的用户</p>
                  </div>
                ) : users.find((u) => u.id === permissionUserId)?.role === "admin" ? (
                  <div className="text-center py-12" style={{ color: "var(--ink-light)" }}>
                    <Shield size={32} className="mx-auto mb-3" style={{ color: "#b45309" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>管理员拥有全部权限</p>
                    <p className="text-xs mt-1">无需单独配置</p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-medium mb-4" style={{ color: "var(--ink)" }}>
                      为 {users.find((u) => u.id === permissionUserId)?.name || "用户"} 配置权限点
                    </h3>
                    <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: "#f0f6ff", color: "#3b82f6" }}>
                      💡 勾选=显式授予 / 不选=模板默认 / 红色=显式撤销<br />
                      角色模板 + 用户追加 - 用户撤销 = 最终权限
                    </p>

                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.name} className="mb-4">
                        <h4 className="text-xs font-medium mb-2 pb-1" style={{ color: "var(--ink-light)", borderBottom: "1px solid #f0ebe0" }}>{group.name}</h4>
                        <div className="space-y-1">
                          {group.codes.map((code) => {
                            const state = getPermissionCheckState(code);
                            return (
                              <label key={code} className="flex items-center gap-3 px-2 py-1 rounded-lg cursor-pointer transition-colors hover:bg-[#faf8f5]">
                                <input type="checkbox" checked={state === "checked"}
                                  onChange={() => togglePermission(code)}
                                  className="w-4 h-4 rounded"
                                  style={{ accentColor: state === "revoked" ? "#ef4444" : "#b45309" }} />
                                <span className="text-sm flex-1" style={{ color: state === "revoked" ? "#ef4444" : "var(--ink)" }}>
                                  {PERMISSION_LABELS[code]}
                                </span>
                                {state === "checked" && (
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#dcfce7", color: "#16a34a" }}>已授予</span>
                                )}
                                {state === "revoked" && (
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#fef2f2", color: "#ef4444" }}>已撤销</span>
                                )}
                                {state === "unchecked" && (
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#f0ebe0", color: "var(--ink-light)" }}>模板默认</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                      <button onClick={handleSavePermissions} disabled={submitting || !permissionsDirty}
                        className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}>
                        {submitting ? "保存中…" : "保存权限"}
                      </button>
                      {permissionsDirty && <span className="text-xs text-amber-600">有未保存的更改</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── 权限模板 V3 ─── */}
        {activeTab === "templates" && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--ink)" }}>权限模板</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ink-light)" }}>预设权限组合，可一键应用到用户</p>

            {templatesLoading ? <p className="text-sm text-center py-8" style={{ color: "var(--ink-light)" }}>加载中…</p> : (
              <div className="grid gap-4">
                {templates.map((tmpl) => (
                  <div key={tmpl.id} className="p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: selectedTemplateId === tmpl.id ? "#faf8f5" : "white" }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium" style={{ color: "var(--ink)" }}>{tmpl.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f0e6d8", color: "#b45309" }}>
                            {roleLabels[tmpl.role] || tmpl.role}
                          </span>
                          <span className="text-xs" style={{ color: "var(--ink-light)" }}>{tmpl.permissionCount} 个权限点</span>
                        </div>
                        {tmpl.description && (
                          <p className="text-xs mb-2" style={{ color: "var(--ink-light)" }}>{tmpl.description}</p>
                        )}
                      </div>
                      <button onClick={() => selectTemplate(tmpl.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                        style={{ borderColor: "var(--border)", color: "var(--ink-light)" }}>
                        {selectedTemplateId === tmpl.id ? "收起" : "查看详情"}
                      </button>
                    </div>

                    {/* 模板详情展开 */}
                    {selectedTemplateId === tmpl.id && templateDetail && (
                      <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                        <h4 className="text-xs font-medium mb-2" style={{ color: "var(--ink-light)" }}>包含的权限点：</h4>
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {templateDetail.permissions?.map((p) => (
                            <span key={p.code} className="text-xs px-2 py-1 rounded-md" style={{ background: "#f0ebe0", color: "var(--ink)" }}>
                              {p.name}
                              {p.group && <span style={{ color: "var(--ink-light)", marginLeft: 4 }}>({p.group})</span>}
                            </span>
                          ))}
                        </div>

                        {/* 快速应用到用户 */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: "var(--ink-light)" }}>应用到：</span>
                          <select onChange={(e) => { if (e.target.value) applyTemplateToUser(tmpl.id, parseInt(e.target.value)); }}
                            className="text-xs px-3 py-1.5 rounded-lg border"
                            style={{ borderColor: "var(--border)", background: "#faf8f5" }} defaultValue="">
                            <option value="">选择用户…</option>
                            {users.filter((u) => u.role !== "admin").map((u) => (
                              <option key={u.id} value={u.id}>{u.name || u.email} ({roleLabels[u.role] || u.role})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {templates.length === 0 && (
                  <p className="text-center py-8 text-sm" style={{ color: "var(--ink-light)" }}>暂无模板，请先执行 seed 数据初始化</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── 临时授权 V3 ─── */}
        {activeTab === "temp-grant" && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--ink)" }}>临时授权</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ink-light)" }}>给用户临时开放某权限，到期自动失效</p>

            {/* 创建临时授权 */}
            <div className="p-4 rounded-xl border mb-6" style={{ borderColor: "var(--border)", background: "#faf8f5" }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: "var(--ink)" }}>创建临时授权</h3>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-light)" }}>目标用户</label>
                  <select value={tempGrantUserId || ""} onChange={(e) => setTempGrantUserId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full text-xs px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", background: "white" }}>
                    <option value="">选择用户…</option>
                    {users.filter((u) => u.role !== "admin").map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-light)" }}>权限点</label>
                  <select value={tempGrantPerm} onChange={(e) => setTempGrantPerm(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", background: "white" }}>
                    <option value="">选择权限…</option>
                    {PERMISSION_GROUPS.map((g) => (
                      <optgroup key={g.name} label={g.name}>
                        {g.codes.map((c) => <option key={c} value={c}>{PERMISSION_LABELS[c]}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-light)" }}>有效期</label>
                  <select value={tempGrantDuration} onChange={(e) => setTempGrantDuration(parseInt(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", background: "white" }}>
                    {TEMP_DURATIONS.map((d) => <option key={d.seconds} value={d.seconds}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-light)" }}>原因（选填）</label>
                  <input type="text" value={tempGrantReason} onChange={(e) => setTempGrantReason(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", background: "white" }} placeholder="如：临时审计" />
                </div>
              </div>
              <button onClick={handleTempGrant} disabled={submitting} className="mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}>
                {submitting ? "授权中…" : "执行临时授权"}
              </button>
            </div>

            {/* 当前临时权限列表 */}
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--ink)" }}>当前有效的临时权限</h3>
            {tempGrantsLoading ? <p className="text-sm text-center py-4" style={{ color: "var(--ink-light)" }}>加载中…</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#faf8f5", borderBottom: "1px solid var(--border)" }}>
                      <th className="text-left p-3 font-medium" style={{ color: "var(--ink-light)" }}>用户</th>
                      <th className="text-left p-3 font-medium" style={{ color: "var(--ink-light)" }}>权限</th>
                      <th className="text-center p-3 font-medium" style={{ color: "var(--ink-light)" }}>剩余时间</th>
                      <th className="text-left p-3 font-medium" style={{ color: "var(--ink-light)" }}>原因</th>
                      <th className="text-right p-3 font-medium" style={{ color: "var(--ink-light)" }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tempGrants.map((tg) => (
                      <tr key={tg.id} style={{ borderBottom: "1px solid #f0ebe0" }} className="hover:bg-[#faf8f5]">
                        <td className="p-3">
                          <span className="font-medium" style={{ color: "var(--ink)" }}>{tg.userName || `用户#${tg.userId}`}</span>
                        </td>
                        <td className="p-3" style={{ color: "var(--ink)" }}>{tg.permissionName}</td>
                        <td className="p-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            tg.remainingMinutes <= 5 ? "text-red-600 bg-red-50"
                            : tg.remainingMinutes <= 30 ? "text-amber-600 bg-amber-50"
                            : "text-green-600 bg-green-50"
                          }`}>
                            {tg.remainingMinutes <= 0 ? "已过期" : `${tg.remainingMinutes} 分钟`}
                          </span>
                        </td>
                        <td className="p-3 text-xs" style={{ color: "var(--ink-light)" }}>{tg.reason || "—"}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => revokeTempGrant(tg.id)} className="text-xs px-2 py-1 rounded-md text-red-600 hover:bg-red-50">撤销</button>
                        </td>
                      </tr>
                    ))}
                    {tempGrants.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-sm" style={{ color: "var(--ink-light)" }}>暂无临时权限</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── 审计日志 V3 ─── */}
        {activeTab === "audit-log" && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--ink)" }}>审计日志</h2>
            <p className="text-sm mb-4" style={{ color: "var(--ink-light)" }}>所有权限变更操作记录，谁改了什么、为什么改</p>

            {/* 过滤器 */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs" style={{ color: "var(--ink-light)" }}>操作类型：</span>
              <select value={auditFilterAction} onChange={(e) => { setAuditFilterAction(e.target.value); setAuditPage(1); }}
                className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)", background: "#faf8f5" }}>
                <option value="">全部</option>
                <option value="GRANT">授权</option>
                <option value="REVOKE">撤销</option>
                <option value="TEMP_GRANT">临时授权</option>
                <option value="TEMP_EXPIRE">临时过期</option>
                <option value="TEMPLATE_APPLY">应用模板</option>
                <option value="ROLE_CHANGE">角色变更</option>
              </select>
            </div>

            {auditLogsLoading ? <p className="text-sm text-center py-8" style={{ color: "var(--ink-light)" }}>加载中…</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#faf8f5", borderBottom: "1px solid var(--border)" }}>
                      <th className="text-left p-3 font-medium" style={{ color: "var(--ink-light)" }}>时间</th>
                      <th className="text-left p-3 font-medium" style={{ color: "var(--ink-light)" }}>操作人</th>
                      <th className="text-left p-3 font-medium" style={{ color: "var(--ink-light)" }}>目标用户</th>
                      <th className="text-center p-3 font-medium" style={{ color: "var(--ink-light)" }}>操作</th>
                      <th className="text-left p-3 font-medium" style={{ color: "var(--ink-light)" }}>权限/详情</th>
                      <th className="text-left p-3 font-medium" style={{ color: "var(--ink-light)" }}>原因</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid #f0ebe0" }} className="hover:bg-[#faf8f5]">
                        <td className="p-3 text-xs" style={{ color: "var(--ink-light)" }}>
                          {new Date(log.createdAt).toLocaleString("zh-CN")}
                        </td>
                        <td className="p-3 text-xs" style={{ color: "var(--ink)" }}>{log.actor?.name || "系统"}</td>
                        <td className="p-3 text-xs" style={{ color: "var(--ink)" }}>{log.targetUser?.name || `用户#${log.targetUser.id}`}</td>
                        <td className="p-3 text-center">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{
                            background: log.action === "GRANT" || log.action === "TEMP_GRANT" ? "#dcfce7"
                              : log.action === "REVOKE" || log.action === "TEMP_EXPIRE" ? "#fef2f2"
                              : log.action === "ROLE_CHANGE" ? "#f0f6ff"
                              : "#f0ebe0",
                            color: log.action === "GRANT" || log.action === "TEMP_GRANT" ? "#16a34a"
                              : log.action === "REVOKE" || log.action === "TEMP_EXPIRE" ? "#ef4444"
                              : log.action === "ROLE_CHANGE" ? "#3b82f6"
                              : "var(--ink-light)",
                          }}>
                            {log.actionLabel}
                          </span>
                        </td>
                        <td className="p-3 text-xs font-mono" style={{ color: "var(--ink)" }}>{log.permission}</td>
                        <td className="p-3 text-xs" style={{ color: "var(--ink-light)" }}>{log.reason || "—"}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: "var(--ink-light)" }}>暂无审计记录</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 分页 */}
            {totalAuditPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button onClick={() => setAuditPage((p) => Math.max(1, p - 1))} disabled={auditPage <= 1}
                  className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: "var(--border)" }}>
                  上一页
                </button>
                <span className="text-xs" style={{ color: "var(--ink-light)" }}>{auditPage} / {totalAuditPages} (共 {auditTotal} 条)</span>
                <button onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))} disabled={auditPage >= totalAuditPages}
                  className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: "var(--border)" }}>
                  下一页
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
