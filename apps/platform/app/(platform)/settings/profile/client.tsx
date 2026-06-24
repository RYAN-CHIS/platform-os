"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { updateProfile, changePassword } from "@/modules/settings/profile/actions";

const TABS = [
  { key: "info", label: "基础信息" },
  { key: "security", label: "安全设置" },
  { key: "login-log", label: "登录记录" },
  { key: "audit-log", label: "操作日志" },
];

export default function ProfileClient({ user }: { user: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();
  const [msg, setMsg] = useState("");

  // Read tab from URL or default to info
  const tabFromUrl = searchParams.get("tab") || "info";
  const tab = TABS.find((t) => t.key === tabFromUrl) ? tabFromUrl : "info";

  function setTab(key: string) {
    router.replace(`/settings/profile${key !== "info" ? `?tab=${key}` : ""}`);
  }

  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [saving, setSaving] = useState(false);

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  // Login log / audit log state
  const [loginLog, setLoginLog] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const r = await updateProfile(user.id, { name, email });
    setSaving(false);
    if (r.ok) {
      setMsg("✅ 资料已保存");
      router.refresh();
    } else {
      setMsg("❌ " + r.error);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) { setMsg("❌ 两次新密码不一致"); return; }
    if (newPwd.length < 8) { setMsg("❌ 新密码至少8位"); return; }
    setChangingPwd(true);
    const r = await changePassword(user.id, curPwd, newPwd);
    setChangingPwd(false);
    if (r.ok) {
      setMsg("✅ 密码已修改，请重新登录");
      setCurPwd(""); setNewPwd(""); setConfirmPwd("");
    } else {
      setMsg("❌ " + r.error);
    }
  };

  // Fetch logs when tab changes
  useEffect(() => {
    if (tab === "login-log") {
      setLoadingLog(true);
      fetch(`/api/audit?userId=${user.id}&action=LOGIN&limit=50`)
        .then((r) => r.json()).then((d) => setLoginLog(d.rows || [])).catch(() => {})
        .finally(() => setLoadingLog(false));
    }
    if (tab === "audit-log") {
      setLoadingLog(true);
      fetch(`/api/audit?userId=${user.id}&limit=50`)
        .then((r) => r.json()).then((d) => setAuditLog(d.rows || [])).catch(() => {})
        .finally(() => setLoadingLog(false));
    }
  }, [tab, user.id]);

  function formatDate(v: any) {
    if (!v) return "—";
    try { return new Date(v).toLocaleString("zh-CN"); } catch { return String(v); }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 300, color: "#292524", marginBottom: 24, letterSpacing: "0.05em" }}>
        个人信息管理
      </h1>

      {msg && (
        <div style={{ marginBottom: 16, padding: "8px 12px", background: "#fafaf9", border: "1px solid #e7e5e4", borderRadius: 6, fontSize: 13, color: "#57534e" }}>
          {msg}
          <button onClick={() => setMsg("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#a8a29e" }}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid #e7e5e4" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: "8px 20px", border: "none", background: "none", cursor: "pointer", fontSize: 14,
              color: tab === t.key ? "#292524" : "#a8a29e",
              fontWeight: tab === t.key ? 500 : 400,
              borderBottom: tab === t.key ? "2px solid #292524" : "2px solid transparent",
              marginBottom: -1, whiteSpace: "nowrap",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: 基础信息 */}
      {tab === "info" && (
        <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#78716c", marginBottom: 4 }}>姓名</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#78716c", marginBottom: 4 }}>邮箱</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#78716c", marginBottom: 4 }}>角色</label>
            <input value={user.role || "—"} readOnly
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e7e5e4", borderRadius: 6, fontSize: 14, background: "#fafaf9", color: "#a8a29e", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#78716c", marginBottom: 4 }}>状态</label>
            <input value={user.status || "active"} readOnly
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e7e5e4", borderRadius: 6, fontSize: 14, background: "#fafaf9", color: "#a8a29e", boxSizing: "border-box" }} />
          </div>
          <button type="submit" disabled={saving}
            style={{ alignSelf: "flex-start", padding: "8px 24px", background: "#292524", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
            {saving ? "保存中…" : "保存更改"}
          </button>
        </form>
      )}

      {/* Tab: 安全设置 */}
      {tab === "security" && (
        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: "#292524", margin: "0 0 4px" }}>修改密码</h3>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#78716c", marginBottom: 4 }}>当前密码</label>
            <input value={curPwd} onChange={(e) => setCurPwd(e.target.value)} type="password" required
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#78716c", marginBottom: 4 }}>新密码（至少8位）</label>
            <input value={newPwd} onChange={(e) => setNewPwd(e.target.value)} type="password" required minLength={8}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#78716c", marginBottom: 4 }}>确认新密码</label>
            <input value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} type="password" required
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <button type="submit" disabled={changingPwd}
            style={{ alignSelf: "flex-start", padding: "8px 24px", background: "#292524", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
            {changingPwd ? "修改中…" : "修改密码"}
          </button>
        </form>
      )}

      {/* Tab: 登录记录 */}
      {tab === "login-log" && (
        <div>
          <p style={{ fontSize: 12, color: "#a8a29e", marginBottom: 12 }}>最近登录记录，最多显示 50 条</p>
          {loadingLog ? (
            <p style={{ fontSize: 13, color: "#a8a29e" }}>加载中…</p>
          ) : loginLog.length === 0 ? (
            <p style={{ fontSize: 13, color: "#a8a29e", padding: 20, textAlign: "center" }}>暂无登录记录</p>
          ) : (
            <div style={{ border: "1px solid #e7e5e4", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafaf9", borderBottom: "1px solid #e7e5e4" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "#78716c" }}>时间</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "#78716c" }}>IP</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "#78716c" }}>结果</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLog.map((log: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f5f5f4" }}>
                      <td style={{ padding: "6px 12px", color: "#57534e" }}>{formatDate(log.created_at)}</td>
                      <td style={{ padding: "6px 12px", color: "#a8a29e", fontFamily: "monospace", fontSize: 11 }}>{log.ip || "—"}</td>
                      <td style={{ padding: "6px 12px" }}>
                        <span style={{
                          padding: "2px 6px", borderRadius: 4, fontSize: 10,
                          background: log.action === "LOGIN_SUCCESS" ? "#dcfce7" : "#fef2f2",
                          color: log.action === "LOGIN_SUCCESS" ? "#16a34a" : "#dc2626",
                        }}>
                          {log.action === "LOGIN_SUCCESS" ? "成功" : "失败"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: 操作日志 */}
      {tab === "audit-log" && (
        <div>
          <p style={{ fontSize: 12, color: "#a8a29e", marginBottom: 12 }}>最近操作记录，最多显示 50 条</p>
          {loadingLog ? (
            <p style={{ fontSize: 13, color: "#a8a29e" }}>加载中…</p>
          ) : auditLog.length === 0 ? (
            <p style={{ fontSize: 13, color: "#a8a29e", padding: 20, textAlign: "center" }}>暂无操作记录</p>
          ) : (
            <div style={{ border: "1px solid #e7e5e4", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafaf9", borderBottom: "1px solid #e7e5e4" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "#78716c" }}>时间</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "#78716c" }}>操作</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "#78716c" }}>模块</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "#78716c" }}>描述</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((log: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f5f5f4" }}>
                      <td style={{ padding: "6px 12px", color: "#57534e", whiteSpace: "nowrap" }}>{formatDate(log.created_at)}</td>
                      <td style={{ padding: "6px 12px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 10, color: "#57534e" }}>{log.action}</span>
                      </td>
                      <td style={{ padding: "6px 12px", color: "#a8a29e" }}>{log.module || "—"}</td>
                      <td style={{ padding: "6px 12px", color: "#78716c", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.description || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
