"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Eye, X, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useSort } from "@/hooks/useSort";

// ---- 类型定义 ----
interface OrderItem {
  skuCode: string;
  skuName: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

interface OrderCustomer {
  id: number;
  code: string;
  name: string;
  phone: string | null;
}

interface Order {
  id: number;
  orderNo: string;
  customer: OrderCustomer;
  channel: string;
  status: string;
  paymentStatus: string;
  items: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  shippingFee: number;
  platformOrderNo: string | null;
  shippingAddress: string | null;
  notes: string | null;
  orderDate: string;
  itemCount?: number;
}

interface CustomerSearch {
  id: number;
  code: string;
  name: string;
  phone: string | null;
}

// ---- 常量 ----
const CHANNEL_LABELS: Record<string, string> = {
  MINIPROGRAM: "小程序",
  WEBSITE: "独立站",
  MANUAL: "手动录入",
};

const CHANNEL_OPTIONS = [
  { value: "", label: "全 部" },
  { value: "MINIPROGRAM", label: "小程序" },
  { value: "WEBSITE", label: "独立站" },
  { value: "MANUAL", label: "手动录入" },
];

const STATUS_OPTIONS = [
  { value: "", label: "全 部" },
  { value: "PENDING", label: "待确认" },
  { value: "CONFIRMED", label: "已确认" },
  { value: "PROCESSING", label: "生产中" },
  { value: "SHIPPED", label: "已发货" },
  { value: "COMPLETED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: "rgba(234,179,8,0.1)", color: "#a16207" },
  CONFIRMED: { bg: "rgba(59,130,246,0.1)", color: "#2563eb" },
  PROCESSING: { bg: "rgba(139,92,246,0.1)", color: "#7c3aed" },
  SHIPPED: { bg: "rgba(249,115,22,0.1)", color: "#c2410c" },
  COMPLETED: { bg: "rgba(16,185,129,0.1)", color: "#059669" },
  CANCELLED: { bg: "rgba(156,163,175,0.12)", color: "#6b7280" },
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "未付款", PARTIAL: "部分付", PAID: "已付款", REFUNDED: "已退款",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  UNPAID: "#ef4444", PARTIAL: "#f59e0b", PAID: "#10b981", REFUNDED: "#8b5cf6",
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [formItems, setFormItems] = useState<OrderItem[]>([]);
  const pageSize = 50;

  // 客户搜索
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerSearch[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearch | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // 表单
  const [form, setForm] = useState({
    channel: "MANUAL",
    status: "PENDING",
    paymentStatus: "UNPAID",
    discount: 0,
    paidAmount: 0,
    shippingFee: 0,
    platformOrderNo: "",
    notes: "",
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (channelFilter) params.set("channel", channelFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders(data.orders);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, page, channelFilter, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // 排序
  const { sorted: sortedOrders, sortKey, sortDir, toggleSort } = useSort(orders);

  // 搜索客户
  async function searchCustomers(q: string) {
    setCustomerSearch(q);
    if (q.length < 1) { setCustomerResults([]); return; }
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}&pageSize=10`);
      const data = await res.json();
      if (res.ok) setCustomerResults(data.customers);
    } catch {}
  }

  function openCreate() {
    setEditOrder(null);
    setSelectedCustomer(null);
    setForm({ channel: "MANUAL", status: "PENDING", paymentStatus: "UNPAID", discount: 0, paidAmount: 0, shippingFee: 0, platformOrderNo: "", notes: "" });
    setFormItems([{ skuCode: "", skuName: "", qty: 1, unitPrice: 0, lineTotal: 0 }]);
    setShowModal(true);
  }

  function openEdit(o: Order) {
    setEditOrder(o);
    const customer = { id: o.customer.id, code: o.customer.code, name: o.customer.name, phone: o.customer.phone };
    setSelectedCustomer(customer);
    setForm({
      channel: o.channel,
      status: o.status,
      paymentStatus: o.paymentStatus,
      discount: o.discount,
      paidAmount: o.paidAmount,
      shippingFee: o.shippingFee,
      platformOrderNo: o.platformOrderNo || "",
      notes: o.notes || "",
    });
    try {
      const items = JSON.parse(o.items || "[]");
      setFormItems(items.length > 0 ? items : [{ skuCode: "", skuName: "", qty: 1, unitPrice: 0, lineTotal: 0 }]);
    } catch {
      setFormItems([{ skuCode: "", skuName: "", qty: 1, unitPrice: 0, lineTotal: 0 }]);
    }
    setShowModal(true);
  }

  function updateItem(idx: number, field: keyof OrderItem, val: string | number) {
    const items = [...formItems];
    const item = { ...items[idx], [field]: val };
    if (field === "qty" || field === "unitPrice") {
      item.lineTotal = parseFloat((Number(item.qty) * Number(item.unitPrice)).toFixed(2));
    }
    items[idx] = item;
    setFormItems(items);
  }

  function addItem() {
    setFormItems([...formItems, { skuCode: "", skuName: "", qty: 1, unitPrice: 0, lineTotal: 0 }]);
  }

  function removeItem(idx: number) {
    if (formItems.length <= 1) return;
    setFormItems(formItems.filter((_, i) => i !== idx));
  }

  const subtotal = formItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const totalAmount = subtotal - Number(form.discount) + Number(form.shippingFee);

  async function handleSave() {
    if (!selectedCustomer) { alert("请选择客户"); return; }
    const validItems = formItems.filter((i) => i.skuName.trim());
    if (validItems.length === 0) { alert("请至少添加一个商品"); return; }
    setSaving(true);
    try {
      const body = {
        customerId: selectedCustomer.id,
        channel: form.channel,
        items: validItems,
        subtotal,
        discount: Number(form.discount),
        totalAmount,
        paidAmount: Number(form.paidAmount),
        shippingFee: Number(form.shippingFee),
        platformOrderNo: form.platformOrderNo || null,
        notes: form.notes || null,
      };
      const url = editOrder ? `/api/orders/${editOrder.id}` : "/api/orders";
      const method = editOrder ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowModal(false);
      fetchOrders();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: number, newStatus: string) {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      fetchOrders();
    } catch {
      alert("状态更新失败");
    }
  }

  async function handleDelete(id: number, orderNo: string) {
    if (!confirm(`确定要删除订单「${orderNo}」吗？`)) return;
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      fetchOrders();
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
          ...th(align === "left" && key === "orderNo" ? "sticky" : undefined, align === "left" && key === "orderNo" ? 0 : undefined, align),
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
    <div style={{ padding: 24, maxWidth: 1700, margin: "0 auto", height: "calc(100vh - 40px)", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 页面标题 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#1a1714" }}>订单管理</h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#888" }}>共 {total} 个订单</p>
        </div>
        <button onClick={openCreate} style={primaryBtnStyle}>
          <Plus size={16} /> 新建订单
        </button>
      </div>

      {/* 筛选栏 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999" }} />
            <input
              type="text"
              placeholder="搜索订单号、客户…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={filterInputStyle}
            />
          </div>
          <select value={channelFilter} onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }} style={selectStyle}>
            {CHANNEL_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={selectStyle}>
            {STATUS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "#888" }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={navBtn(page <= 1)}>
            <ChevronLeft size={14} />
          </button>
          <span>第 {page}/{totalPages} 页</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={navBtn(page >= totalPages)}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div style={{ flex: 1, minHeight: 0, background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, zIndex: 10, background: "#fafaf7" }}>
                {renderSortTh("订单号", "orderNo")}
                {renderSortTh("客户", "customer.name")}
                {renderSortTh("渠道", "channel")}
                {renderSortTh("状态", "status")}
                {renderSortTh("付款", "paymentStatus")}
                {renderSortTh("商品数", "itemCount")}
                {renderSortTh("总额", "totalAmount", "right")}
                {renderSortTh("已付", "paidAmount", "right")}
                {renderSortTh("日期", "orderDate")}
                <th style={{ ...th("", 0, "center") }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: "#999" }}>加载中…</td></tr>
              ) : sortedOrders.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: "#999" }}>暂无订单数据</td></tr>
              ) : (
                sortedOrders.map((o) => (
                  <tr key={o.id} style={{ borderBottom: "1px solid #f0ede6", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fafaf7")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td style={td("sticky", 0)}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.76rem", color: "#b45309", fontWeight: 600 }}>{o.orderNo}</span>
                      {o.platformOrderNo && (
                        <div style={{ fontSize: "0.65rem", color: "#aaa", fontFamily: "monospace" }}>{o.platformOrderNo}</div>
                      )}
                    </td>
                    <td style={td()}>
                      <div style={{ fontWeight: 500 }}>{o.customer.name}</div>
                      {o.customer.phone && <div style={{ fontSize: "0.7rem", color: "#999" }}>{o.customer.phone}</div>}
                    </td>
                    <td style={td()}>
                      <span style={badgeStyle(o.channel)}>
                        {CHANNEL_LABELS[o.channel] || o.channel}
                      </span>
                    </td>
                    <td style={td()}>
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                        style={{
                          ...statusSelectStyle,
                          background: STATUS_STYLE[o.status]?.bg || "#f5f5f0",
                          color: STATUS_STYLE[o.status]?.color || "#666",
                          borderColor: STATUS_STYLE[o.status]?.color || "#ddd",
                        }}
                      >
                        {STATUS_OPTIONS.filter((s) => s.value).map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={td()}>
                      <span style={{
                        fontSize: "0.72rem", fontWeight: 500,
                        color: PAYMENT_STATUS_COLORS[o.paymentStatus] || "#666",
                      }}>
                        {PAYMENT_STATUS_LABELS[o.paymentStatus] || o.paymentStatus}
                      </span>
                    </td>
                    <td style={{ ...td(), textAlign: "center" }}>{o.itemCount || 0}</td>
                    <td style={{ ...td(), textAlign: "right", fontWeight: 600 }}>¥{(o.totalAmount || 0).toFixed(2)}</td>
                    <td style={{ ...td(), textAlign: "right", color: o.paidAmount > 0 ? "#059669" : "#999" }}>
                      ¥{(o.paidAmount || 0).toFixed(2)}
                    </td>
                    <td style={td("", 0, "", "0.76rem")}>{new Date(o.orderDate).toLocaleDateString("zh-CN")}</td>
                    <td style={{ ...tdStickyRight, textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <button onClick={() => openEdit(o)} style={iconBtn} title="编辑"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(o.id, o.orderNo)} style={{ ...iconBtn, color: "#dc2626" }} title="删除"><Trash2 size={14} /></button>
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editOrder ? `编辑订单 ${editOrder.orderNo}` : "新建订单"} width="760px">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 客户选择 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={labelStyle}>选择客户 <span style={{ color: "#dc2626" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <input
                  style={inputStyle}
                  placeholder="搜索客户名称/电话…"
                  value={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone || "无电话"})` : customerSearch}
                  onChange={(e) => { searchCustomers(e.target.value); setSelectedCustomer(null); setShowCustomerDropdown(true); }}
                  onFocus={() => setShowCustomerDropdown(true)}
                />
                {selectedCustomer && (
                  <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }} style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    border: "none", background: "none", cursor: "pointer", color: "#999", padding: 2,
                  }}>
                    <X size={14} />
                  </button>
                )}
                {showCustomerDropdown && customerResults.length > 0 && !selectedCustomer && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                    background: "#fff", border: "1px solid #e0dcd5", borderRadius: 8,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.1)", maxHeight: 180, overflowY: "auto",
                  }}>
                    {customerResults.map((c) => (
                      <div key={c.id} onClick={() => {
                        setSelectedCustomer(c);
                        setShowCustomerDropdown(false);
                        setCustomerSearch("");
                      }} style={{
                        padding: "8px 12px", cursor: "pointer",
                        borderBottom: "1px solid #f0ede6", fontSize: "0.82rem",
                      }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fafaf7")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                      >
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                        <span style={{ color: "#999", marginLeft: 8, fontSize: "0.75rem" }}>{c.phone || ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={labelStyle}>来源渠道</label>
              <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} style={inputStyle}>
                {CHANNEL_OPTIONS.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 订单商品 */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={labelStyle}>订单商品 <span style={{ color: "#dc2626" }}>*</span></label>
              <button onClick={addItem} style={{ ...iconBtn, color: "#b45309", border: "1px solid rgba(180,83,9,0.2)", background: "rgba(180,83,9,0.04)" }}>
                <Plus size={14} /> 添加行
              </button>
            </div>
            <div style={{ border: "1px solid #e0dcd5", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ background: "#fafaf7" }}>
                    <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 500, color: "#777" }}>商品编码</th>
                    <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 500, color: "#777" }}>商品名称</th>
                    <th style={{ padding: "6px 10px", textAlign: "center", fontWeight: 500, color: "#777", width: 70 }}>数量</th>
                    <th style={{ padding: "6px 10px", textAlign: "right", fontWeight: 500, color: "#777", width: 100 }}>单价</th>
                    <th style={{ padding: "6px 10px", textAlign: "right", fontWeight: 500, color: "#777", width: 100 }}>小计</th>
                    <th style={{ padding: "6px 10px", width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formItems.map((item, idx) => (
                    <tr key={idx} style={{ borderTop: "1px solid #f0ede6" }}>
                      <td style={{ padding: "4px 6px" }}>
                        <input style={{ ...itemInputStyle, fontFamily: "monospace" }} value={item.skuCode}
                          onChange={(e) => updateItem(idx, "skuCode", e.target.value)} placeholder="SKU-001" />
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        <input style={itemInputStyle} value={item.skuName}
                          onChange={(e) => updateItem(idx, "skuName", e.target.value)} placeholder="商品名称" />
                      </td>
                      <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        <input type="number" min="1" style={{ ...itemInputStyle, textAlign: "center", width: 60 }}
                          value={item.qty} onChange={(e) => updateItem(idx, "qty", parseInt(e.target.value) || 0)} />
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        <input type="number" min="0" step="0.01" style={{ ...itemInputStyle, textAlign: "right" }}
                          value={item.unitPrice || ""} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} />
                      </td>
                      <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 500 }}>
                        ¥{item.lineTotal.toFixed(2)}
                      </td>
                      <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        <button onClick={() => removeItem(idx)} style={{
                          border: "none", background: "none", cursor: "pointer",
                          color: "#ccc", padding: 2,
                        }} title="删除行"><X size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 金额汇总 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <FormField label="运费"><input type="number" min="0" step="0.01" style={inputStyle} value={form.shippingFee || ""}
              onChange={(e) => setForm({ ...form, shippingFee: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="折扣金额"><input type="number" min="0" step="0.01" style={inputStyle} value={form.discount || ""}
              onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="已付金额"><input type="number" min="0" step="0.01" style={inputStyle} value={form.paidAmount || ""}
              onChange={(e) => setForm({ ...form, paidAmount: parseFloat(e.target.value) || 0 })} /></FormField>
          </div>
          <div style={{
            background: "#fafaf7", padding: "10px 14px", borderRadius: 8,
            display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600,
          }}>
            <span>小计：¥{subtotal.toFixed(2)}</span>
            <span>折扣：-¥{Number(form.discount).toFixed(2)}</span>
            <span>运费：+¥{Number(form.shippingFee).toFixed(2)}</span>
            <span style={{ color: "#b45309" }}>订单总额：¥{totalAmount.toFixed(2)}</span>
          </div>

          {/* 更多字段 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <FormField label="平台订单号">
              <input style={inputStyle} value={form.platformOrderNo} onChange={(e) => setForm({ ...form, platformOrderNo: e.target.value })} placeholder="小程序/独立站订单号" />
            </FormField>
            <FormField label="付款状态">
              <select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })} style={inputStyle}>
                <option value="UNPAID">未付款</option>
                <option value="PARTIAL">部分付款</option>
                <option value="PAID">已付款</option>
                <option value="REFUNDED">已退款</option>
              </select>
            </FormField>
            <FormField label="订单状态">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                {STATUS_OPTIONS.filter((s) => s.value).map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="备注">
            <textarea style={{ ...inputStyle, minHeight: 50, resize: "vertical" } as any}
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="订单备注" />
          </FormField>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button onClick={() => setShowModal(false)} style={cancelBtnStyle}>取消</button>
            <button onClick={handleSave} disabled={saving} style={primaryBtnStyle}>
              {saving ? "保存中…" : editOrder ? "保存修改" : "创建订单"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---- 小组件 ---- */
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

/* ---- 样式工具 ---- */
const th = (position?: string, left?: number, align?: string) => ({
  padding: "10px 14px", textAlign: (align || "left") as any,
  fontSize: "0.75rem", fontWeight: 600, color: "#777",
  borderBottom: "2px solid #e0dcd5", whiteSpace: "nowrap" as const,
  ...(position === "sticky" ? { position: "sticky" as const, left: `${left ?? 0}px`, background: "#fafaf7", zIndex: 11 } : {}),
});

const td = (position?: string, left?: number, align?: string, fontSize?: string) => ({
  padding: "10px 14px", textAlign: (align || "left") as any,
  fontSize: fontSize || "0.82rem", color: "#444",
  ...(position === "sticky" ? { position: "sticky" as const, left: `${left ?? 0}px`, background: "#fff", zIndex: 5 } : {}),
});

const tdStickyRight: React.CSSProperties = {
  padding: "10px 14px", textAlign: "center",
  position: "sticky", right: 0, background: "#fff", zIndex: 5,
  boxShadow: "-4px 0 8px rgba(0,0,0,0.03)",
};

const labelStyle: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 500, color: "#555" };

const inputStyle: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 6, border: "1px solid #e0dcd5",
  fontSize: "0.85rem", outline: "none", width: "100%", boxSizing: "border-box",
  background: "#fafaf8",
};

const itemInputStyle: React.CSSProperties = {
  padding: "5px 8px", border: "1px solid transparent", borderRadius: 4,
  fontSize: "0.8rem", outline: "none", width: "100%", boxSizing: "border-box",
  background: "transparent",
};

const filterInputStyle: React.CSSProperties = {
  padding: "8px 12px 8px 32px", borderRadius: 8,
  border: "1px solid #e0dcd5", fontSize: "0.85rem", width: 220,
  outline: "none", background: "#fafaf8",
};

const selectStyle: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #e0dcd5",
  fontSize: "0.8rem", outline: "none", background: "#fafaf8",
  color: "#555", cursor: "pointer",
};

const statusSelectStyle: React.CSSProperties = {
  padding: "3px 8px", borderRadius: 4, border: "1px solid #e0dcd5",
  fontSize: "0.72rem", fontWeight: 500, outline: "none", cursor: "pointer",
};

const primaryBtnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 18px", borderRadius: 8,
  background: "linear-gradient(135deg, #b45309, #92400e)",
  color: "#fff", border: "none", cursor: "pointer",
  fontSize: "0.85rem", fontWeight: 600,
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "8px 20px", borderRadius: 8,
  background: "#f5f5f0", color: "#666", border: "1px solid #e0dcd5",
  cursor: "pointer", fontSize: "0.85rem",
};

const iconBtn: React.CSSProperties = {
  padding: "4px 8px", borderRadius: 6, border: "1px solid #e0dcd5",
  background: "#fff", cursor: "pointer", color: "#888",
  display: "flex", alignItems: "center",
};

const navBtn = (disabled: boolean): React.CSSProperties => ({
  padding: "4px 8px", border: "1px solid #e0dcd5", borderRadius: 6,
  background: disabled ? "#f5f5f0" : "#fff",
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.4 : 1,
});

function badgeStyle(channel: string): React.CSSProperties {
  const colors: Record<string, string> = {
    MINIPROGRAM: "#07c160",
    WEBSITE: "#3b82f6",
    MANUAL: "#b45309",
  };
  const color = colors[channel] || "#b45309";
  return {
    padding: "2px 8px", borderRadius: 4,
    background: `${color}10`, color,
    fontSize: "0.72rem", fontWeight: 500,
  };
}
