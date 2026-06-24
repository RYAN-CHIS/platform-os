"use client";
/**
 * BrandCrudModal — WO-P12B
 * Reusable form modal for Brand CRUD (add/edit/delete)
 */
import { useState } from "react";

export interface FormField {
  key: string;
  label: string;
  type: "text" | "number" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string;
}

export interface CrudModalProps {
  mode: "add" | "edit";
  title: string;
  fields: FormField[];
  initialData?: Record<string, unknown>;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<{ error?: string } | void>;
}

export function CrudModal({ mode, title, fields, initialData, onClose, onSubmit }: CrudModalProps) {
  const [form, setForm] = useState<Record<string, unknown>>(() => {
    if (initialData) return { ...initialData };
    const init: Record<string, unknown> = {};
    fields.forEach((f) => {
      init[f.key] = f.defaultValue ?? "";
    });
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await onSubmit(form);
      if (result?.error) setError(result.error);
      else onClose();
    } catch (e: any) {
      setError(e.message || "提交失败");
    }
    setLoading(false);
  }

  function setField(key: string, val: unknown) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 12,
        width: "100%", maxWidth: 520, maxHeight: "85vh", overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid #f5f5f4",
        }}>
          <span style={{ fontWeight: 500, fontSize: 15, color: "#1c1917" }}>{title}</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "16px 20px 20px" }}>
          {fields.map((f) => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, color: "#57534e", marginBottom: 4 }}>
                {f.label}
                {f.required && <span style={{ color: "#dc2626" }}> *</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  value={String(form[f.key] ?? "")}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                  rows={4}
                  style={inputStyle}
                />
              ) : f.type === "select" && f.options ? (
                <select
                  value={String(form[f.key] ?? (f.options[0]?.value ?? ""))}
                  onChange={(e) => setField(f.key, e.target.value)}
                  style={inputStyle}
                >
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  value={String(form[f.key] ?? "")}
                  onChange={(e) => setField(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                  step={f.type === "number" ? "0.01" : undefined}
                  style={inputStyle}
                />
              )}
            </div>
          ))}

          {error && (
            <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 6, marginBottom: 12, fontSize: 13, color: "#dc2626" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={btnStyle("secondary")}>取消</button>
            <button type="submit" disabled={loading} style={btnStyle("primary")}>
              {loading ? "保存中…" : mode === "add" ? "创建" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Modal (delete) ──────────────────────────────
export function ConfirmModal({ title, message, onConfirm, onClose }: {
  title: string; message: string; onConfirm: () => Promise<void>; onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9100,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 12, width: "100%", maxWidth: 360,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden",
      }}>
        <div style={{ padding: "20px 20px 12px" }}>
          <span style={{ fontWeight: 500, fontSize: 15, color: "#1c1917" }}>{title}</span>
          <p style={{ fontSize: 13, color: "#78716c", marginTop: 8 }}>{message}</p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "0 20px 20px" }}>
          <button onClick={onClose} style={btnStyle("secondary")}>取消</button>
          <button
            onClick={async () => { setLoading(true); try { await onConfirm(); } finally { setLoading(false); } }}
            disabled={loading}
            style={{ ...btnStyle("danger") }}
          >
            {loading ? "删除中…" : "确认删除"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared Styles ──────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "6px 10px", border: "1px solid #e7e5e4",
  borderRadius: 6, fontSize: 13, outline: "none",
  background: "#fff", boxSizing: "border-box",
  fontFamily: "inherit",
};

const closeBtnStyle: React.CSSProperties = {
  background: "none", border: "none", fontSize: 18,
  cursor: "pointer", color: "#a8a29e", lineHeight: 1,
  padding: "2px 6px", borderRadius: 4,
};

function btnStyle(variant: "primary" | "secondary" | "danger"): React.CSSProperties {
  const base: React.CSSProperties = {
    height: 36, padding: "0 14px", borderRadius: 6, fontSize: 13,
    cursor: "pointer", border: "1px solid", fontWeight: 400,
    whiteSpace: "nowrap",
  };
  if (variant === "danger") return { ...base, background: "#dc2626", color: "#fff", borderColor: "#dc2626" };
  if (variant === "primary") return { ...base, background: "#1c1917", color: "#fff", borderColor: "#1c1917" };
  return { ...base, background: "#fff", color: "#44403c", borderColor: "#e7e5e4" };
}
