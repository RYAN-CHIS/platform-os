"use client";

import { useState } from "react";
import { listSeoConfigs, saveSeoConfig } from "@/modules/brand/seo/actions";
import { Card } from "@yunwu/ui";

const PAGE_ICONS: Record<string, string> = {
  home: "🏠",
  products: "📦",
  series: "📚",
  journal: "✍️",
  about: "ℹ️",
  contact: "📞",
};

export default function BrandSeoClient({
  initialConfigs,
}: {
  initialConfigs: any[];
}) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{
    message: string;
    type: string;
  } | null>(null);

  const handleSave = async (cfg: any) => {
    setSaving((prev) => ({ ...prev, [cfg.page_key]: true }));
    const r = await saveSeoConfig(cfg);
    setSaving((prev) => ({ ...prev, [cfg.page_key]: false }));
    if (r.error) {
      setToast({ message: r.error, type: "error" });
      return;
    }
    setToast({ message: `${cfg.page_key} SEO 已保存`, type: "success" });
  };

  return (
    <div>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            background: toast.type === "error" ? "#fee2e2" : "#dcfce7",
            padding: "8px 16px",
            borderRadius: 8,
            zIndex: 100,
            cursor: "pointer",
          }}
          onClick={() => setToast(null)}
        >
          {toast.message}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 300,
              letterSpacing: "0.1em",
              color: "#292524",
            }}
          >
            SEO 配置中心
          </h1>
          <p style={{ fontSize: 12, color: "#a8a29e", marginTop: 4 }}>
            管理各页面的搜索引擎优化信息
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {configs.map((cfg: any) => {
          const hasContent =
            cfg.description || cfg.keywords || cfg.og_image;
          return (
            <Card key={cfg.page_key} padding="lg">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 20 }}>
                  {PAGE_ICONS[cfg.page_key] || "📄"}
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 500, flex: 1 }}>
                  {cfg.title}
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: hasContent ? "#dcfce7" : "#fef3c7",
                    color: hasContent ? "#16a34a" : "#d97706",
                  }}
                >
                  {hasContent ? "已配置" : "未配置"}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <label style={{ fontSize: 12, color: "#78716c" }}>
                  SEO 标题
                  <input
                    value={cfg.title}
                    onChange={(e) =>
                      setConfigs((prev) =>
                        prev.map((c) =>
                          c.page_key === cfg.page_key
                            ? { ...c, title: e.target.value }
                            : c,
                        ),
                      )
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: "6px 10px",
                      border: "1px solid #e7e5e4",
                      borderRadius: 4,
                    }}
                  />
                </label>
                <label style={{ fontSize: 12, color: "#78716c" }}>
                  Keywords
                  <input
                    value={cfg.keywords || ""}
                    onChange={(e) =>
                      setConfigs((prev) =>
                        prev.map((c) =>
                          c.page_key === cfg.page_key
                            ? { ...c, keywords: e.target.value }
                            : c,
                        ),
                      )
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: "6px 10px",
                      border: "1px solid #e7e5e4",
                      borderRadius: 4,
                    }}
                  />
                </label>
                <label
                  style={{
                    fontSize: 12,
                    color: "#78716c",
                    gridColumn: "span 2",
                  }}
                >
                  Description
                  <textarea
                    rows={2}
                    value={cfg.description || ""}
                    onChange={(e) =>
                      setConfigs((prev) =>
                        prev.map((c) =>
                          c.page_key === cfg.page_key
                            ? { ...c, description: e.target.value }
                            : c,
                        ),
                      )
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: "6px 10px",
                      border: "1px solid #e7e5e4",
                      borderRadius: 4,
                      resize: "vertical",
                    }}
                  />
                </label>
                <label style={{ fontSize: 12, color: "#78716c" }}>
                  OG 标题
                  <input
                    value={cfg.og_title || ""}
                    onChange={(e) =>
                      setConfigs((prev) =>
                        prev.map((c) =>
                          c.page_key === cfg.page_key
                            ? { ...c, og_title: e.target.value }
                            : c,
                        ),
                      )
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: "6px 10px",
                      border: "1px solid #e7e5e4",
                      borderRadius: 4,
                    }}
                  />
                </label>
                <label style={{ fontSize: 12, color: "#78716c" }}>
                  OG 图片 URL
                  <input
                    value={cfg.og_image || ""}
                    onChange={(e) =>
                      setConfigs((prev) =>
                        prev.map((c) =>
                          c.page_key === cfg.page_key
                            ? { ...c, og_image: e.target.value }
                            : c,
                        ),
                      )
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: "6px 10px",
                      border: "1px solid #e7e5e4",
                      borderRadius: 4,
                    }}
                  />
                </label>
                <label style={{ fontSize: 12, color: "#78716c" }}>
                  Canonical URL
                  <input
                    value={cfg.canonical || ""}
                    onChange={(e) =>
                      setConfigs((prev) =>
                        prev.map((c) =>
                          c.page_key === cfg.page_key
                            ? { ...c, canonical: e.target.value }
                            : c,
                        ),
                      )
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: "6px 10px",
                      border: "1px solid #e7e5e4",
                      borderRadius: 4,
                    }}
                  />
                </label>
                <label style={{ fontSize: 12, color: "#78716c" }}>
                  Robots
                  <select
                    value={cfg.robots || ""}
                    onChange={(e) =>
                      setConfigs((prev) =>
                        prev.map((c) =>
                          c.page_key === cfg.page_key
                            ? { ...c, robots: e.target.value }
                            : c,
                        ),
                      )
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: "6px 10px",
                      border: "1px solid #e7e5e4",
                      borderRadius: 4,
                    }}
                  >
                    <option value="">默认</option>
                    <option value="index,follow">index, follow</option>
                    <option value="noindex,follow">noindex, follow</option>
                    <option value="index,nofollow">index, nofollow</option>
                    <option value="noindex,nofollow">noindex, nofollow</option>
                  </select>
                </label>
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => handleSave(cfg)}
                  disabled={saving[cfg.page_key]}
                  style={{
                    padding: "8px 16px",
                    background: "#292524",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  {saving[cfg.page_key] ? "保存中..." : "保存 SEO 配置"}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
