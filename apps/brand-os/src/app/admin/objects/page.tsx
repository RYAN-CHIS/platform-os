"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { getObjectCategories } from "@/lib/actions/admin-actions";

type Category = {
  name: string;
  slug: string;
  enumValue: string;
};

const CONFIG: Record<string, { desc: string }> = {
  BRACELET:  { desc: "串珠为饰，佩于腕间。每一颗珠子都承载着材料与时间的故事。" },
  INCENSE:   { desc: "焚香之器，一炉一世界。烟火日常中寻得片刻宁静。" },
  SEAL:      { desc: "以刀为笔，以石为纸。每一次落刀都是与时间的对话。" },
  CERAMIC:   { desc: "泥土经火，成为器物。时间与温度共同完成的艺术。" },
  ENAMEL:    { desc: "金属与釉彩的相遇。慢工艺价值的极致呈现。" },
  SCHOLAR:   { desc: "笔墨纸砚，文人精神的栖息地。器物承载书写与思考。" },
};

export default function AdminObjectsPage() {
  const [items, setItems]   = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await getObjectCategories();
    setItems(data as any);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const textStyle  = { color: "var(--yun-text)" };
  const subStyle   = { color: "var(--yun-subtext)" };
  const lineStyle  = { borderColor: "var(--yun-line)" };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium tracking-[0.1em]" style={textStyle}>器物体系</h1>
        <p className="text-xs mt-1" style={subStyle}>
          ObjectCategory 为枚举类型，通过 schema.prisma 管理，不可在后台运行时修改。
        </p>
      </div>

      {loading ? (
        <p className="text-xs py-8 text-center" style={subStyle}>加载中…</p>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.enumValue} className="bg-white border rounded p-4 flex items-center justify-between" style={lineStyle}>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" style={textStyle}>{c.name}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--yun-line)]" style={subStyle}>
                    {c.enumValue}
                  </span>
                </div>
                <p className="text-xs mt-1" style={subStyle}>
                  {CONFIG[c.enumValue]?.desc || "—"}
                </p>
                <p className="text-[11px] mt-0.5" style={subStyle}>slug: {c.slug}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
