"use client";
/**
 * BrandHomeClient — WO-P13C
 * Interactive publishing workflow for Brand Home page_contents + site_settings.
 */
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createPageContent,
  updatePageContent,
  deletePageContent,
  updateSiteSetting,
  submitHomeForReview,
  approveHome,
  rejectHome,
  publishHomeNow,
  scheduleHomePublish,
  unpublishHome,
  archiveHome,
  getHomeVersions,
  rollbackHome,
  getHomeStatus,
} from "@/modules/brand/home/actions";

// ── Types ──

interface PageContentRow {
  id: string;
  page_key: string;
  section_key: string;
  title: string;
  content: string;
  sort_order: number;
  status: string;
  published: boolean;
  published_at: string | null;
}

interface Stats {
  seriesCount: number;
  productCount: number;
  journalCount: number;
  materialCount: number;
  mediaCount: number;
  bannerCount: number;
  orderCount: number;
  contactCount: number;
}

// ── Status badge ──

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    DRAFT: "草稿",
    IN_REVIEW: "审核中",
    APPROVED: "已通过",
    SCHEDULED: "已定时",
    PUBLISHED: "已发布",
    ARCHIVED: "已归档",
    REJECTED: "已驳回",
  };
  return map[s] || s;
}

function statusColor(s: string): { bg: string; fg: string; border: string } {
  const map: Record<string, { bg: string; fg: string; border: string }> = {
    DRAFT: { bg: "#f5f5f4", fg: "#78716c", border: "#e7e5e4" },
    IN_REVIEW: { bg: "#fef9c3", fg: "#a16207", border: "#fde047" },
    APPROVED: { bg: "#dbeafe", fg: "#1d4ed8", border: "#93c5fd" },
    SCHEDULED: { bg: "#e0e7ff", fg: "#4338ca", border: "#a5b4fc" },
    PUBLISHED: { bg: "#ecfdf5", fg: "#059669", border: "#a7f3d0" },
    ARCHIVED: { bg: "#f5f5f4", fg: "#a8a29e", border: "#d6d3d1" },
    REJECTED: { bg: "#fef2f2", fg: "#dc2626", border: "#fecaca" },
  };
  return map[s] || { bg: "#f5f5f4", fg: "#78716c", border: "#e7e5e4" };
}

// ── Workflow button labels & actions ──

interface WFButton {
  label: string;
  status: string;
  action: (id: string) => Promise<any>;
  color: string;
}

function getWorkflowButtons(
  row: PageContentRow,
  actions: ReturnType<typeof useWorkflowActions>
): WFButton[] {
  const s = row.status;
  const btns: WFButton[] = [];

  // DRAFT
  if (s === "DRAFT") {
    btns.push({ label: "提交审核", status: "IN_REVIEW", action: actions.submitReview, color: "#ca8a04" });
    btns.push({ label: "立即发布", status: "PUBLISHED", action: actions.publishNow, color: "#059669" });
    btns.push({ label: "归档", status: "ARCHIVED", action: actions.archive, color: "#a8a29e" });
  }
  // IN_REVIEW
  if (s === "IN_REVIEW") {
    btns.push({ label: "通过", status: "APPROVED", action: actions.approve, color: "#2563eb" });
    btns.push({ label: "驳回", status: "REJECTED", action: actions.reject, color: "#dc2626" });
    btns.push({ label: "退回草稿", status: "DRAFT", action: actions.unpublish, color: "#78716c" });
  }
  // APPROVED
  if (s === "APPROVED") {
    btns.push({ label: "定时发布", status: "SCHEDULED", action: actions.schedule, color: "#4338ca" });
    btns.push({ label: "立即发布", status: "PUBLISHED", action: actions.publishNow, color: "#059669" });
    btns.push({ label: "驳回", status: "REJECTED", action: actions.reject, color: "#dc2626" });
    btns.push({ label: "退回草稿", status: "DRAFT", action: actions.unpublish, color: "#78716c" });
  }
  // SCHEDULED
  if (s === "SCHEDULED") {
    btns.push({ label: "立即发布", status: "PUBLISHED", action: actions.publishNow, color: "#059669" });
    btns.push({ label: "取消定时", status: "APPROVED", action: actions.approve, color: "#2563eb" });
    btns.push({ label: "退回草稿", status: "DRAFT", action: actions.unpublish, color: "#78716c" });
  }
  // PUBLISHED
  if (s === "PUBLISHED") {
    btns.push({ label: "归档", status: "ARCHIVED", action: actions.archive, color: "#a8a29e" });
    btns.push({ label: "下线", status: "DRAFT", action: actions.unpublish, color: "#78716c" });
  }
  // ARCHIVED
  if (s === "ARCHIVED") {
    btns.push({ label: "恢复草稿", status: "DRAFT", action: actions.unpublish, color: "#78716c" });
    btns.push({ label: "提交审核", status: "IN_REVIEW", action: actions.submitReview, color: "#ca8a04" });
  }
  // REJECTED
  if (s === "REJECTED") {
    btns.push({ label: "修改后重提", status: "DRAFT", action: actions.unpublish, color: "#78716c" });
    btns.push({ label: "重新审核", status: "IN_REVIEW", action: actions.submitReview, color: "#ca8a04" });
  }

  return btns;
}

// ── Edit Modal ──

function EditContentModal({
  row,
  onSave,
  onClose,
}: {
  row: PageContentRow;
  onSave: (data: Record<string, unknown>) => Promise<{ error?: string }>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    pageKey: row.page_key,
    sectionKey: row.section_key,
    title: row.title,
    content: row.content,
    sortOrder: String(row.sort_order),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const r = await onSave({
      page_key: form.pageKey,
      section_key: form.sectionKey,
      title: form.title,
      content: form.content,
      sort_order: Number(form.sortOrder),
    });
    setLoading(false);
    if (r?.error) {
      setError(r.error);
      return;
    }
    onClose();
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>编辑内容区块</h3>
        <form onSubmit={handleSubmit}>
          {[
            { key: "pageKey", label: "页面 Key" },
            { key: "sectionKey", label: "区块 Key" },
            { key: "title", label: "标题" },
          ].map((f) => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <label style={labelStyle}>{f.label}</label>
              <input
                value={String(form[f.key as keyof typeof form] ?? "")}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                style={inputStyle}
              />
            </div>
          ))}
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>排序</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>内容</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              rows={5}
              style={inputStyle}
            />
          </div>
          {error && (
            <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 6, marginBottom: 12, fontSize: 13, color: "#dc2626" }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>取消</button>
            <button type="submit" disabled={loading} style={saveBtnStyle}>
              {loading ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Modal ──

function AddContentModal({
  onSave,
  onClose,
}: {
  onSave: (data: { pageKey: string; sectionKey: string; title: string; content: string; sortOrder?: number }) => Promise<any>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ pageKey: "", sectionKey: "", title: "", content: "", sortOrder: "0" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const r = await onSave({
      pageKey: form.pageKey,
      sectionKey: form.sectionKey,
      title: form.title,
      content: form.content,
      sortOrder: Number(form.sortOrder),
    });
    setLoading(false);
    if (r.error) {
      setError(r.error);
      return;
    }
    onClose();
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>新增内容区块</h3>
        <form onSubmit={handleSubmit}>
          {[
            { key: "pageKey", label: "页面 Key" },
            { key: "sectionKey", label: "区块 Key" },
            { key: "title", label: "标题" },
          ].map((f) => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <label style={labelStyle}>{f.label}</label>
              <input
                value={String(form[f.key as keyof typeof form] ?? "")}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                required
                style={inputStyle}
              />
            </div>
          ))}
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>排序</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>内容</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              rows={5}
              style={inputStyle}
            />
          </div>
          {error && (
            <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 6, marginBottom: 12, fontSize: 13, color: "#dc2626" }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>取消</button>
            <button type="submit" disabled={loading} style={saveBtnStyle}>
              {loading ? "创建中…" : "创建"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Version History Modal ──

function VersionHistoryModal({
  contentId,
  onClose,
}: {
  contentId: string;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState<number | null>(null);

  useEffect(() => {
    getHomeVersions(contentId).then(setVersions).finally(() => setLoading(false));
  }, [contentId]);

  async function handleRollback(v: number) {
    if (!confirm(`确定回滚到版本 ${v}？`)) return;
    setRolling(v);
    await rollbackHome(contentId, v);
    setRolling(null);
    onClose();
  }

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 700 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>版本历史</h3>
        {loading ? (
          <p style={{ color: "#a8a29e" }}>加载中…</p>
        ) : versions.length === 0 ? (
          <p style={{ color: "#a8a29e" }}>暂无版本记录</p>
        ) : (
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e7e5e4", textAlign: "left" }}>
                  <th style={thStyle}>版本</th>
                  <th style={thStyle}>状态</th>
                  <th style={thStyle}>时间</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id} style={{ borderBottom: "1px solid #f5f5f4" }}>
                    <td style={tdStyle}>v{v.version}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: "1px 6px", borderRadius: 4, fontSize: 11,
                        ...statusBadgeStyle(v.status),
                      }}>
                        {statusLabel(v.status)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 11, color: "#a8a29e" }}>
                      {v.created_at ? new Date(v.created_at).toLocaleString("zh-CN") : "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <button
                        onClick={() => handleRollback(v.version)}
                        disabled={rolling === v.version}
                        style={actionLinkStyle}
                      >
                        {rolling === v.version ? "回滚中…" : "回滚"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <button onClick={onClose} style={cancelBtnStyle}>关闭</button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Delete Modal ──

function ConfirmDeleteModal({
  title,
  onConfirm,
  onClose,
}: {
  title: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 400 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>确认删除</h3>
        <p style={{ fontSize: 13, color: "#57534e", marginBottom: 20 }}>
          确定要删除「{title}」吗？此操作不可撤销。
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={cancelBtnStyle}>取消</button>
          <button onClick={onConfirm} style={{ ...saveBtnStyle, background: "#dc2626", color: "#fff", borderColor: "#dc2626" }}>
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Site Settings Editor ──

function SiteSettingsEditor({
  settings,
  onRefresh,
}: {
  settings: Record<string, string>;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<{ key: string; value: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    await updateSiteSetting(editing.key, editing.value);
    setSaving(false);
    setEditing(null);
    onRefresh();
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 4, fontSize: 13 }}>
        {Object.entries(settings).map(([k, v]) => (
          editing && editing.key === k ? (
            <React.Fragment key={k}>
              <div style={{ ...settingsCellStyle, fontFamily: "monospace", fontSize: 12 }}>{k}</div>
              <input
                value={editing.value}
                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                style={{ ...inputStyle, margin: 0 }}
              />
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={handleSave} disabled={saving} style={miniBtnStyle}>
                  {saving ? "…" : "保存"}
                </button>
                <button onClick={() => setEditing(null)} style={{ ...miniBtnStyle, color: "#78716c" }}>
                  取消
                </button>
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment key={k}>
              <div style={{ ...settingsCellStyle, fontFamily: "monospace", fontSize: 12, color: "#78716c" }}>{k}</div>
              <div style={{ ...settingsCellStyle, overflow: "hidden", textOverflow: "ellipsis" }}>{String(v)}</div>
              <div>
                <button onClick={() => setEditing({ key: k, value: String(v) })} style={miniBtnStyle}>
                  编辑
                </button>
              </div>
            </React.Fragment>
          )
        ))}
      </div>
    </div>
  );
}

// ── Hooks ──

function useWorkflowActions(refresh: () => void) {
  const router = useRouter();

  const wrap = useCallback(
    (fn: (id: string, ...args: any[]) => Promise<any>, ...args: any[]) =>
      async (id: string) => {
        const r = await fn(id, ...args);
        if (r.success === false && r.error) {
          alert(r.error);
          return;
        }
        refresh();
        router.refresh();
      },
    [refresh, router]
  );

  return {
    submitReview: wrap(submitHomeForReview),
    approve: wrap(approveHome),
    reject: useCallback(
      async (id: string) => {
        const reason = prompt("驳回理由（可选）：");
        const r = await rejectHome(id, reason || undefined);
        if (r.success === false && r.error) { alert(r.error); return; }
        refresh();
        router.refresh();
      },
      [refresh, router]
    ),
    publishNow: wrap(publishHomeNow),
    schedule: useCallback(
      async (id: string) => {
        const d = prompt("发布时间（如 2026-06-25T10:00:00）：");
        if (!d) return;
        const r = await scheduleHomePublish(id, d);
        if (r.success === false && r.error) { alert(r.error); return; }
        refresh();
        router.refresh();
      },
      [refresh, router]
    ),
    unpublish: wrap(unpublishHome),
    archive: wrap(archiveHome),
  };
}

// ── Main Component ──

import React from "react";

export function BrandHomeClient({
  initialStats,
  initialPages,
  initialSettings,
}: {
  initialStats: Stats;
  initialPages: PageContentRow[];
  initialSettings: Record<string, string>;
}) {
  const router = useRouter();
  const [pages, setPages] = useState<PageContentRow[]>(initialPages);
  const [settings, setSettings] = useState(initialSettings);
  const [showAdd, setShowAdd] = useState(false);
  const [editRow, setEditRow] = useState<PageContentRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<PageContentRow | null>(null);
  const [versionRow, setVersionRow] = useState<PageContentRow | null>(null);

  const refreshPages = useCallback(async () => {
    const { getPageContents: refresh } = await import("@/modules/brand/home/actions");
    const data = await refresh();
    setPages(data);
  }, []);

  const refreshSettings = useCallback(async () => {
    const { getSiteSettings: refresh } = await import("@/modules/brand/home/actions");
    const data = await refresh();
    setSettings(data as Record<string, string>);
  }, []);

  const refreshAll = useCallback(() => {
    refreshPages();
    refreshSettings();
    router.refresh();
  }, [refreshPages, refreshSettings, router]);

  const wf = useWorkflowActions(refreshAll);

  const statCards = [
    { label: "系列", value: initialStats.seriesCount, href: "/brand/series" },
    { label: "产品", value: initialStats.productCount, href: "/brand/products" },
    { label: "品牌志", value: initialStats.journalCount, href: "/brand/journal" },
    { label: "材料", value: initialStats.materialCount, href: "/brand/materials" },
    { label: "媒体", value: initialStats.mediaCount, href: "/brand/media" },
    { label: "Banner", value: initialStats.bannerCount, href: "/brand/banners" },
    { label: "订单", value: initialStats.orderCount, href: "/brand/orders" },
    { label: "留言", value: initialStats.contactCount, href: "/brand/contacts" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 300, letterSpacing: "0.1em", color: "#1c1917" }}>
          Brand 概览
        </h1>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
        {statCards.map((c) => (
          <a key={c.href} href={c.href} style={{ textDecoration: "none" }}>
            <div style={statCardStyle}>
              <div style={{ fontSize: 24, fontWeight: 300, color: "#1c1917" }}>{c.value}</div>
              <div style={{ fontSize: 12, color: "#78716c", marginTop: 4 }}>{c.label}</div>
            </div>
          </a>
        ))}
      </div>

      {/* 首页内容区块 */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 400, color: "#44403c" }}>首页内容区块（page_contents）</h2>
          <button onClick={() => setShowAdd(true)} style={addBtnStyle}>+ 新增区块</button>
        </div>

        {pages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#a8a29e", border: "1px dashed #e7e5e4", borderRadius: 8 }}>
            <p style={{ fontSize: 14 }}>暂无内容区块</p>
            <button onClick={() => setShowAdd(true)} style={{ ...addBtnStyle, marginTop: 12 }}>创建第一个区块</button>
          </div>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid #e7e5e4", borderRadius: 8, background: "#fff" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e7e5e4", background: "#fafaf9" }}>
                  <th style={thStyle}>pageKey</th>
                  <th style={thStyle}>sectionKey</th>
                  <th style={thStyle}>标题</th>
                  <th style={thStyle}>排序</th>
                  <th style={thStyle}>状态</th>
                  <th style={thStyle}>工作流</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((row) => {
                  const wfBtns = getWorkflowButtons(row, wf);
                  const sc = statusColor(row.status);
                  return (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f5f5f4" }}>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>{row.page_key}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>{row.section_key}</td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{row.title || "—"}</td>
                      <td style={tdStyle}>{row.sort_order}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 4, fontSize: 11,
                          background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}`,
                          whiteSpace: "nowrap",
                        }}>
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {wfBtns.map((b) => (
                            <button
                              key={b.label}
                              onClick={() => b.action(row.id)}
                              style={{
                                padding: "2px 8px", borderRadius: 4, fontSize: 11,
                                background: "#fff", color: b.color, border: `1px solid ${b.color}`,
                                cursor: "pointer", whiteSpace: "nowrap",
                              }}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                        <button onClick={() => setEditRow(row)} style={actionLinkStyle}>编辑</button>
                        <button onClick={() => setVersionRow(row)} style={actionLinkStyle}>版本</button>
                        <button onClick={() => setDeleteRow(row)} style={{ ...actionLinkStyle, color: "#dc2626" }}>删除</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 站点设置 */}
      <div className="mb-8">
        <h2 style={{ fontSize: 16, fontWeight: 400, color: "#44403c", marginBottom: 12 }}>
          站点设置（site_settings）
        </h2>
        {Object.keys(settings).length === 0 ? (
          <p style={{ color: "#a8a29e", fontSize: 13 }}>暂无站点设置</p>
        ) : (
          <div style={{ border: "1px solid #e7e5e4", borderRadius: 8, background: "#fff", padding: 16 }}>
            <SiteSettingsEditor settings={settings} onRefresh={refreshAll} />
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <AddContentModal
          onSave={async (data) => {
            const r = await createPageContent(data);
            if (r.error) return r;
            setShowAdd(false);
            refreshAll();
            return r;
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editRow && (
        <EditContentModal
          row={editRow}
          onSave={async (data) => {
            const r = await updatePageContent(editRow.id, data);
            if (r.error) return { error: String(r.error) };
            setEditRow(null);
            refreshAll();
            return { error: undefined };
          }}
          onClose={() => setEditRow(null)}
        />
      )}

      {deleteRow && (
        <ConfirmDeleteModal
          title={deleteRow.title || deleteRow.section_key}
          onConfirm={async () => {
            await deletePageContent(deleteRow.id);
            setDeleteRow(null);
            refreshAll();
          }}
          onClose={() => setDeleteRow(null)}
        />
      )}

      {versionRow && (
        <VersionHistoryModal
          contentId={versionRow.id}
          onClose={() => { setVersionRow(null); refreshAll(); }}
        />
      )}
    </div>
  );
}

// ── Styles ──

const statCardStyle: React.CSSProperties = {
  padding: "16px 20px",
  background: "#fff",
  borderRadius: 8,
  border: "1px solid #e7e5e4",
};

const addBtnStyle: React.CSSProperties = {
  height: 32,
  padding: "0 14px",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
  background: "#1c1917",
  color: "#fff",
  border: "1px solid #1c1917",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.3)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: 24,
  width: "90%",
  maxWidth: 540,
  maxHeight: "80vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#78716c",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  border: "1px solid #e7e5e4",
  borderRadius: 6,
  fontSize: 13,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const cancelBtnStyle: React.CSSProperties = {
  height: 32,
  padding: "0 14px",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
  background: "#fff",
  color: "#78716c",
  border: "1px solid #d6d3d1",
};

const saveBtnStyle: React.CSSProperties = {
  height: 32,
  padding: "0 14px",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
  background: "#1c1917",
  color: "#fff",
  border: "1px solid #1c1917",
};

const miniBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 11,
  color: "#2563eb",
  padding: "2px 4px",
};

const actionLinkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 12,
  color: "#d97706",
  marginLeft: 8,
  textDecoration: "underline",
};

function statusBadgeStyle(s: string): React.CSSProperties {
  const c = statusColor(s);
  return { background: c.bg, color: c.fg, borderColor: c.border };
}

const thStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 500,
  color: "#78716c",
  textTransform: "uppercase" as const,
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  color: "#44403c",
  verticalAlign: "middle" as const,
};

const settingsCellStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderBottom: "1px solid #f5f5f4",
  display: "flex",
  alignItems: "center",
};
