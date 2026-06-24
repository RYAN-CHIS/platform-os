"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { updateProfile, changePassword } from "@/modules/settings/profile/actions";

export default function ProfileClient({ user }: { user: any }) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"info" | "password">("info");

  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [saving, setSaving] = useState(false);

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

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

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 300, color: "#292524", marginBottom: 24, letterSpacing: "0.05em" }}>
        个人信息管理
      </h1>

      {msg && (
        <div style={{ marginBottom: 16, padding: "8px 12px", background: "#fafaf9", border: "1px solid #e7e5e4", borderRadius: 6, fontSize: 13, color: "#57534e" }}>
          {msg}
          <button onClick={() => setMsg("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#a8a29e" }}>✕</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid #e7e5e4" }}>
        {(["info","password"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "8px 20px", border: "none", background: "none", cursor: "pointer", fontSize: 14, color: tab === t ? "#292524" : "#a8a29e", fontWeight: tab === t ? 500 : 400, borderBottom: tab === t ? "2px solid #292524" : "2px solid transparent", marginBottom: -1 }}>
            {t === "info" ? "个人资料" : "修改密码"}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="姓名" value={name} onChange={setName} />
          <Field label="邮箱" value={email} onChange={setEmail} type="email" />
          <Field label="角色" value={user.role} readOnly />
          <Field label="状态" value={user.status || "active"} readOnly />
          <button type="submit" disabled={saving}
            style={{ alignSelf: "flex-start", padding: "8px 24px", background: "#292524", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
            {saving ? "保存中…" : "保存更改"}
          </button>
        </form>
      )}

      {tab === "password" && (
        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="当前密码" value={curPwd} onChange={setCurPwd} type="password" required />
          <Field label="新密码" value={newPwd} onChange={setNewPwd} type="password" required min={8} />
          <Field label="确认新密码" value={confirmPwd} onChange={setConfirmPwd} type="password" required />
          <button type="submit" disabled={changingPwd}
            style={{ alignSelf: "flex-start", padding: "8px 24px", background: "#292524", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
            {changingPwd ? "修改中…" : "修改密码"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", readOnly, required, min }: {
  label: string; value: string; onChange?: (v: string) => void; type?: string; readOnly?: boolean; required?: boolean; min?: number;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#78716c" }}>
      {label}
      <input
        value={value} onChange={e => onChange?.(e.target.value)} type={type} readOnly={readOnly} required={required} minLength={min}
        style={{ padding: "8px 12px", border: "1px solid #e7e5e4", borderRadius: 6, fontSize: 14, outline: "none", background: readOnly ? "#fafaf9" : "#fff", color: readOnly ? "#a8a29e" : "#292524", width: "100%", boxSizing: "border-box" }}
      />
    </label>
  );
}
