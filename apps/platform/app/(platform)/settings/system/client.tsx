"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/ActionBar";
import type { SystemConfigRow, SystemStatus } from "@/modules/settings/system/actions";
import {
  updateSystemConfig, createSystemConfig,
} from "@/modules/settings/system/actions";
import { getConfigLabel, CONFIG_TEMPLATES } from "@/modules/settings/system/config";

const TYPE_LABELS: Record<string, string> = {
  string: "文本", boolean: "布尔", number: "数字", json: "JSON",
};

export default function SystemClient({
  initialConfigs, initialStatus,
}: { initialConfigs: SystemConfigRow[]; initialStatus: SystemStatus }) {
  const router = useRouter();
  const [configs, setConfigs] = useState(initialConfigs);
  useEffect(() => { setConfigs(initialConfigs); }, [initialConfigs]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({ key: "", value: "", type: "string", description: "" });

  const handleEdit = (key: string, value: string) => {
    setEditing(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    const value = editing[key];
    if (value === undefined) return;
    setSaving(prev => ({ ...prev, [key]: true }));
    const r = await updateSystemConfig(key, value);
    if (r.ok) {
      setConfigs(prev => prev.map(c => c.key === key ? { ...c, value } : c));
      setEditing(prev => { const n = { ...prev }; delete n[key]; return n; });
      setMsg(`「${getConfigLabel(key)}」已保存`);
    } else {
      setMsg(`保存失败: ${r.error}`);
    }
    setSaving(prev => ({ ...prev, [key]: false }));
    router.refresh();
  };

  const handleCreate = async () => {
    if (!newForm.key.trim()) { setMsg("请输入配置项名称"); return; }
    setSaving(prev => ({ ...prev, "__new__": true }));
    const r = await createSystemConfig(newForm);
    setSaving(prev => ({ ...prev, "__new__": false }));
    if (r.ok) {
      setNewOpen(false);
      setNewForm({ key: "", value: "", type: "string", description: "" });
      setMsg(`配置「${getConfigLabel(newForm.key)}」已创建`);
      router.refresh();
    } else {
      setMsg(r.error || "创建失败");
    }
  };

  const applyTemplate = (tpl: typeof CONFIG_TEMPLATES[0]) => {
    setNewForm({ key: tpl.key, value: "", type: tpl.type, description: tpl.description });
  };

  const handleCancel = (key: string) => {
    setEditing(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const csvColumns = [
    { key: "label", label: "配置名称" },
    { key: "value", label: "值" },
    { key: "description", label: "说明" },
    { key: "type", label: "类型" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">系统配置</h1>
        <button onClick={() => setNewOpen(true)} style={{ padding: "8px 16px", background: "#292524", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
          + 新增
        </button>
      </div>

      {msg && (
        <div className="mb-4 px-3 py-2 bg-stone-50 border border-stone-200 rounded text-sm text-stone-600">
          {msg}
          <button className="ml-3 text-stone-400 hover:text-stone-600" onClick={() => setMsg("")}>✕</button>
        </div>
      )}

      {/* Runtime Info */}
      <section className="mb-6">
        <h2 className="text-lg font-light text-stone-700 mb-3">运行时状态</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoCard label="ERP DB" value={initialStatus.erpConnected ? "已连接" : "未连接"} ok={initialStatus.erpConnected} />
          <InfoCard label="Brand DB" value={initialStatus.brandConnected ? "已连接" : "未连接"} ok={initialStatus.brandConnected} />
          <InfoCard label="环境" value={initialStatus.nodeEnv} />
          <InfoCard label="版本" value="P14B" />
        </div>
      </section>

      {/* Stats */}
      <section className="mb-6">
        <h2 className="text-lg font-light text-stone-700 mb-3">数据统计</h2>
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "用户", value: initialStatus.userCount },
            { label: "ERP 产品", value: initialStatus.productCount },
            { label: "Brand 产品", value: initialStatus.brandProductCount },
            { label: "品牌志", value: initialStatus.journalCount },
            { label: "订单", value: initialStatus.orderCount },
          ].map(s => (
            <div key={s.label} className="p-3 border border-stone-200 rounded text-center bg-white">
              <div className="text-xl font-light text-stone-800">{s.value}</div>
              <div className="text-xs text-stone-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* System Configs */}
      <section className="mb-6">
        <h2 className="text-lg font-light text-stone-700 mb-3">可编辑配置</h2>

        <ActionBar
          module="settings-system-configs"
          csvColumns={csvColumns}
          data={configs.map(c => ({ label: getConfigLabel(c.key), value: c.value, description: c.description, type: TYPE_LABELS[c.type] || "文本" }))}
          searchPlaceholder="搜索配置..."
        />

        <div className="border border-stone-200 rounded overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-stone-50 text-stone-500">
                <th className="text-left py-2 px-3">配置名称</th>
                <th className="text-left py-2 px-3">值</th>
                <th className="text-left py-2 px-3">说明</th>
                <th className="text-left py-2 px-3">类型</th>
                <th className="text-right py-2 px-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {configs.map(c => {
                const isEditing = c.key in editing;
                return (
                  <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50/50">
                    <td className="py-2 px-3">
                      <span className="font-medium">{getConfigLabel(c.key)}</span>
                      <span className="ml-2 font-mono text-[10px] text-stone-400">{c.key}</span>
                    </td>
                    <td className="py-2 px-3">
                      {isEditing ? (
                        c.type === "boolean" ? (
                          <select value={editing[c.key]} onChange={e => handleEdit(c.key, e.target.value)}
                            className="w-24 h-8 px-2 border border-stone-200 rounded text-sm bg-white">
                            <option value="false">关闭</option>
                            <option value="true">开启</option>
                          </select>
                        ) : (
                          <input type={c.type === "number" ? "number" : "text"} value={editing[c.key]}
                            onChange={e => handleEdit(c.key, e.target.value)}
                            className="w-full h-8 px-2 border border-stone-300 rounded text-sm outline-none focus:border-stone-500" />
                        )
                      ) : (
                        <span className="font-medium">{c.type === "boolean" ? (c.value === "true" ? "✅ 开启" : "⏸ 关闭") : c.value}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-xs text-stone-400">{c.description}</td>
                    <td className="py-2 px-3 text-xs">{TYPE_LABELS[c.type] || "文本"}</td>
                    <td className="py-2 px-3 text-right">
                      {isEditing ? (
                        <div className="flex gap-1 justify-end">
                          <Btn onClick={() => handleSave(c.key)} variant="primary" disabled={saving[c.key]}>
                            {saving[c.key] ? "保存中" : "保存"}
                          </Btn>
                          <Btn onClick={() => handleCancel(c.key)}>取消</Btn>
                        </div>
                      ) : (
                        <Btn onClick={() => handleEdit(c.key, c.value)}>编辑</Btn>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* New Config Modal */}
      {newOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 8, width: 560, maxHeight: "80vh", overflow: "auto", padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>新增配置</h3>

            {/* Template quick-select */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#78716c", marginBottom: 6 }}>快捷模板</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {CONFIG_TEMPLATES.map(tpl => (
                  <button key={tpl.key} onClick={() => applyTemplate(tpl)}
                    style={{ padding: "4px 10px", border: newForm.key === tpl.key ? "2px solid #292524" : "1px solid #e7e5e4", borderRadius: 14, fontSize: 11, cursor: "pointer", background: "#fff" }}>
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 12, color: "#78716c" }}>配置项 key（英文）
                <input value={newForm.key} onChange={e => setNewForm({ ...newForm, key: e.target.value })}
                  placeholder="如 siteLogo" style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #e7e5e4", borderRadius: 4, boxSizing: "border-box" }} />
              </label>
              <label style={{ fontSize: 12, color: "#78716c" }}>中文名称
                <input value={getConfigLabel(newForm.key)} readOnly
                  style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #e7e5e4", borderRadius: 4, background: "#fafaf9", boxSizing: "border-box" }} />
              </label>
              <label style={{ fontSize: 12, color: "#78716c" }}>类型
                <select value={newForm.type} onChange={e => setNewForm({ ...newForm, type: e.target.value })}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #e7e5e4", borderRadius: 4, boxSizing: "border-box" }}>
                  <option value="string">文本 (string)</option>
                  <option value="boolean">布尔 (boolean)</option>
                  <option value="number">数字 (number)</option>
                  <option value="json">JSON (json)</option>
                </select>
              </label>
              <label style={{ fontSize: 12, color: "#78716c" }}>值
                {newForm.type === "boolean" ? (
                  <select value={newForm.value} onChange={e => setNewForm({ ...newForm, value: e.target.value })}
                    style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #e7e5e4", borderRadius: 4, boxSizing: "border-box" }}>
                    <option value="true">开启</option>
                    <option value="false">关闭</option>
                  </select>
                ) : (
                  <input value={newForm.value} onChange={e => setNewForm({ ...newForm, value: e.target.value })}
                    placeholder="配置值" style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #e7e5e4", borderRadius: 4, boxSizing: "border-box" }} />
                )}
              </label>
              <label style={{ fontSize: 12, color: "#78716c" }}>说明
                <input value={newForm.description} onChange={e => setNewForm({ ...newForm, description: e.target.value })}
                  placeholder="配置说明" style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #e7e5e4", borderRadius: 4, boxSizing: "border-box" }} />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => { setNewOpen(false); setNewForm({ key: "", value: "", type: "string", description: "" }); }}
                style={{ padding: "8px 16px", border: "1px solid #e7e5e4", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13 }}>取消</button>
              <button onClick={handleCreate} disabled={saving["__new__"]}
                style={{ padding: "8px 16px", background: "#292524", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                {saving["__new__"] ? "创建中..." : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const icon = ok === undefined ? "" : ok ? "✅" : "❌";
  return (
    <div className="p-3 border border-stone-200 rounded bg-white">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-sm font-medium text-stone-800">{icon} {value}</div>
    </div>
  );
}

function Btn({ onClick, children, variant, disabled }: { onClick: () => void; children: React.ReactNode; variant?: "primary"; disabled?: boolean }) {
  const bg = variant === "primary" ? "#1c1917" : "#fafaf9";
  const color = variant === "primary" ? "#fff" : "#78716c";
  const border = variant === "primary" ? "#1c1917" : "#e7e5e4";
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ height: 28, padding: "0 10px", borderRadius: 4, fontSize: 12, cursor: disabled ? "wait" : "pointer",
        background: bg, color, border: `1px solid ${border}`, opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}
