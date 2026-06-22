"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Phone, Mail, MessageCircle, MapPin, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useSort } from "@/hooks/useSort";

interface Customer {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  source: string | null;
  address: string | null;
  tags: string | null;
  notes: string | null;
  _count?: { orders: number };
  createdAt: string;
}

const CHANNEL_LABELS: Record<string, string> = {
  MINIPROGRAM: "小程序",
  WEBSITE: "独立站",
  MANUAL: "手动录入",
};

const CHANNEL_OPTIONS = [
  { value: "MINIPROGRAM", label: "小程序" },
  { value: "WEBSITE", label: "独立站" },
  { value: "MANUAL", label: "手动录入" },
];

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const pageSize = 50;

  // 表单数据
  const [form, setForm] = useState({
    name: "", phone: "", email: "", wechat: "",
    source: "", address: "", notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCustomers(data.customers);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 排序
  const { sorted: sortedCustomers, sortKey, sortDir, toggleSort } = useSort(customers);

  function openCreate() {
    setEditCustomer(null);
    setForm({ name: "", phone: "", email: "", wechat: "", source: "", address: "", notes: "" });
    setShowModal(true);
  }

  function openEdit(c: Customer) {
    setEditCustomer(c);
    setForm({
      name: c.name, phone: c.phone || "", email: c.email || "", wechat: c.wechat || "",
      source: c.source || "", address: c.address || "", notes: c.notes || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { alert("客户名称不能为空"); return; }
    setSaving(true);
    try {
      const url = editCustomer ? `/api/customers/${editCustomer.id}` : "/api/customers";
      const method = editCustomer ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowModal(false);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`确定要删除客户「${name}」吗？`)) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  }

  // 渲染排序表头
  function renderSortTh(label: string, key: string, align: "left" | "center" | "right" = "left") {
    const isActive = sortKey === key;
    const icon = isActive
      ? sortDir === "asc"
        ? <ArrowUp size={12} />
        : <ArrowDown size={12} />
      : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    
    const textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
    
    return (
      <th
        style={{
          ...thStyle(align === "left" && key === "code" ? "sticky" : undefined, align === "left" && key === "code" ? 0 : undefined, align),
          cursor: "pointer",
          userSelect: "none",
          color: isActive ? "#b45309" : "#777",
        }}
        onClick={() => toggleSort(key)}
        title={`按${label}排序`}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: textAlign === "right" ? "flex-end" : textAlign === "center" ? "center" : "flex-start", width: "100%" }}>
          {label}
          <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
        </span>
      </th>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: "0 auto", height: "calc(100vh - 40px)", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 页面标题 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#1a1714" }}>客户管理</h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#888" }}>共 {total} 个客户</p>
        </div>
        <button
          onClick={openCreate}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 18px", borderRadius: 8,
            background: "linear-gradient(135deg, #b45309, #92400e)",
            color: "#fff", border: "none", cursor: "pointer",
            fontSize: "0.85rem", fontWeight: 600,
          }}
        >
          <Plus size={16} /> 新增客户
        </button>
      </div>

      {/* 搜索和分页 */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 12, flexShrink: 0,
      }}>
        <div style={{ position: "relative", flex: "max-content" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#999" }} />
          <input
            type="text"
            placeholder="搜索客户名称、编码、电话…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              padding: "8px 12px 8px 36px", borderRadius: 8,
              border: "1px solid #e0dcd5", fontSize: "0.85rem", width: 280,
              outline: "none", background: "#fafaf8",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "#888" }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              padding: "4px 8px", border: "1px solid #e0dcd5", borderRadius: 6,
              background: page <= 1 ? "#f5f5f0" : "#fff", cursor: page <= 1 ? "default" : "pointer",
              opacity: page <= 1 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <span>第 {page}/{totalPages} 页</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              padding: "4px 8px", border: "1px solid #e0dcd5", borderRadius: 6,
              background: page >= totalPages ? "#f5f5f0" : "#fff", cursor: page >= totalPages ? "default" : "pointer",
              opacity: page >= totalPages ? 0.4 : 1,
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div style={{
        flex: 1, minHeight: 0, background: "#fff", borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ flex: 1, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, zIndex: 10, background: "#fafaf7" }}>
                {renderSortTh("编码", "code")}
                {renderSortTh("名称", "name")}
                {renderSortTh("联系电话", "phone")}
                {renderSortTh("微信", "wechat")}
                {renderSortTh("邮箱", "email")}
                {renderSortTh("来源", "source")}
                {renderSortTh("地址", "address")}
                {renderSortTh("订单数", "_count.orders")}
                <th style={thStyle("", 0, "right")}>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#999" }}>加载中…</td></tr>
              ) : sortedCustomers.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#999" }}>暂无客户数据</td></tr>
              ) : (
                sortedCustomers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f0ede6", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fafaf7")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td style={tdStyle("sticky", 0)}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#b45309" }}>{c.code}</span>
                    </td>
                    <td style={tdStyle()}><strong>{c.name}</strong></td>
                    <td style={tdStyle()}>{c.phone || "-"}</td>
                    <td style={tdStyle()}>{c.wechat || "-"}</td>
                    <td style={tdStyle("", 0, "", "0.78rem")}>{c.email || "-"}</td>
                    <td style={tdStyle()}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4,
                        background: c.source === "MINIPROGRAM" ? "rgba(7,193,96,0.08)" :
                          c.source === "WEBSITE" ? "rgba(59,130,246,0.08)" : "rgba(180,83,9,0.06)",
                        color: c.source === "MINIPROGRAM" ? "#07c160" :
                          c.source === "WEBSITE" ? "#3b82f6" : "#b45309",
                        fontSize: "0.72rem", fontWeight: 500,
                      }}>
                        {CHANNEL_LABELS[c.source || ""] || "手动录入"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle(), maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.address || "-"}
                    </td>
                    <td style={{ ...tdStyle(), textAlign: "center" }}>
                      {c._count?.orders || 0}
                    </td>
                    <td style={{ ...tdStyle(), textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => openEdit(c)}
                          style={iconBtnStyle}
                          title="编辑"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          style={{ ...iconBtnStyle, color: "#dc2626" }}
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editCustomer ? "编辑客户" : "新增客户"} width="560px">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FormField label="客户名称" required>
            <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入客户名称" />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="联系电话">
              <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="手机号码" />
            </FormField>
            <FormField label="微信">
              <input style={inputStyle} value={form.wechat} onChange={(e) => setForm({ ...form, wechat: e.target.value })} placeholder="微信号" />
            </FormField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="邮箱">
              <input style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="邮箱地址" />
            </FormField>
            <FormField label="来源渠道">
              <select
                style={inputStyle}
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                <option value="">请选择</option>
                {CHANNEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="地址">
            <input style={inputStyle} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="收货地址" />
          </FormField>
          <FormField label="备注">
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" } as any}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="备注信息"
            />
          </FormField>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button onClick={() => setShowModal(false)} style={cancelBtnStyle}>取消</button>
            <button onClick={handleSave} disabled={saving} style={saveBtnStyle}>
              {saving ? "保存中…" : editCustomer ? "保存修改" : "创建客户"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---- 小组件 ---- */
function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: "0.78rem", fontWeight: 500, color: "#555" }}>
        {required && <span style={{ color: "#dc2626", marginRight: 2 }}>*</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

/* ---- 样式工具 ---- */
const thStyle = (position?: string, left?: number, align?: string) => ({
  padding: "10px 14px",
  textAlign: (align || "left") as any,
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#777",
  borderBottom: "2px solid #e0dcd5",
  whiteSpace: "nowrap" as const,
  ...(position === "sticky" ? {
    position: "sticky" as const,
    left: `${left ?? 0}px`,
    background: "#fafaf7",
    zIndex: 11,
  } : {}),
});

const tdStyle = (position?: string, left?: number, align?: string, fontSize?: string) => ({
  padding: "10px 14px",
  textAlign: (align || "left") as any,
  fontSize: fontSize || "0.82rem",
  color: "#444",
  ...(position === "sticky" ? {
    position: "sticky" as const,
    left: `${left ?? 0}px`,
    background: "#fff",
    zIndex: 5,
  } : {}),
});

const inputStyle: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 6,
  border: "1px solid #e0dcd5", fontSize: "0.85rem",
  outline: "none", width: "100%", boxSizing: "border-box",
  background: "#fafaf8",
};

const iconBtnStyle: React.CSSProperties = {
  padding: "4px 8px", borderRadius: 6,
  border: "1px solid #e0dcd5", background: "#fff",
  cursor: "pointer", color: "#888",
  display: "flex", alignItems: "center",
};

const saveBtnStyle: React.CSSProperties = {
  padding: "8px 20px", borderRadius: 8,
  background: "linear-gradient(135deg, #b45309, #92400e)",
  color: "#fff", border: "none", cursor: "pointer",
  fontSize: "0.85rem", fontWeight: 600,
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "8px 20px", borderRadius: 8,
  background: "#f5f5f0", color: "#666", border: "1px solid #e0dcd5",
  cursor: "pointer", fontSize: "0.85rem",
};
