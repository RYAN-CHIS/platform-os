"use client";
/**
 * Settings System Client — WO-P12D
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/ActionBar";
import type { SystemConfigRow, SystemStatus } from "@/modules/settings/system/actions";
import { updateSystemConfig } from "@/modules/settings/system/actions";

export default function SystemClient({
  initialConfigs,
  initialStatus,
}: {
  initialConfigs: SystemConfigRow[];
  initialStatus: SystemStatus;
}) {
  const router = useRouter();
  const [configs, setConfigs] = useState(initialConfigs);
  useEffect(() => { setConfigs(initialConfigs); }, [initialConfigs]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");

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
      setMsg(`「${key}」已保存`);
    } else {
      setMsg(`保存失败: ${r.error}`);
    }
    setSaving(prev => ({ ...prev, [key]: false }));
    router.refresh();
  };

  const handleCancel = (key: string) => {
    setEditing(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const configMap = Object.fromEntries(configs.map(c => [c.key, c.value]));

  const csvColumns = [
    { key: "key", label: "配置项" },
    { key: "value", label: "值" },
    { key: "description", label: "说明" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">系统配置</h1>
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
          <InfoCard label="版本" value="vP12D" />
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

      {/* Environment */}
      <section className="mb-6">
        <h2 className="text-lg font-light text-stone-700 mb-3">环境变量检查</h2>
        <div className="grid grid-cols-3 gap-3">
          <InfoCard label="DATABASE_URL" value={initialStatus.hasDbUrl ? "已配置" : "未配置"} ok={initialStatus.hasDbUrl} />
          <InfoCard label="BRAND_DATABASE_URL" value={initialStatus.hasBrandDbUrl ? "已配置" : "未配置"} ok={initialStatus.hasBrandDbUrl} />
        </div>
      </section>

      {/* System Configs */}
      <section className="mb-6">
        <h2 className="text-lg font-light text-stone-700 mb-3">可编辑配置</h2>

        <ActionBar
          module="settings-system-configs"
          csvColumns={csvColumns}
          data={configs.map(c => ({ key: c.key, value: c.value, description: c.description }))}
          searchPlaceholder="搜索配置..."
        />

        <div className="border border-stone-200 rounded overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-stone-50 text-stone-500">
                <th className="text-left py-2 px-3">配置项</th>
                <th className="text-left py-2 px-3">值</th>
                <th className="text-left py-2 px-3">说明</th>
                <th className="text-right py-2 px-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {configs.map(c => {
                const isEditing = c.key in editing;
                return (
                  <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50/50">
                    <td className="py-2 px-3 font-mono text-xs text-stone-600">{c.key}</td>
                    <td className="py-2 px-3">
                      {isEditing ? (
                        c.key === "maintenanceMode" ? (
                          <select
                            value={editing[c.key]}
                            onChange={e => handleEdit(c.key, e.target.value)}
                            className="w-24 h-8 px-2 border border-stone-200 rounded text-sm bg-white"
                          >
                            <option value="false">关闭</option>
                            <option value="true">开启</option>
                          </select>
                        ) : (
                          <input
                            type={c.key === "uploadLimit" ? "number" : "text"}
                            value={editing[c.key]}
                            onChange={e => handleEdit(c.key, e.target.value)}
                            className="w-full h-8 px-2 border border-stone-300 rounded text-sm outline-none focus:border-stone-500"
                          />
                        )
                      ) : (
                        <span className="font-medium">{c.value}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-xs text-stone-400">{c.description}</td>
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
    <button onClick={onClick} disabled={disabled} style={{ height: 28, padding: "0 10px", borderRadius: 4, fontSize: 12, cursor: disabled ? "wait" : "pointer", background: bg, color, border: `1px solid ${border}`, opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}
