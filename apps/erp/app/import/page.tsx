"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react";

interface ImportResult {
  ok?: boolean;
  error?: string;
  log?: string[];
}

const templates = [
  { type: "raw-materials", label: "原材料模板", desc: "原料编码、名称、品类、单颗成本等" },
  { type: "works",        label: "七序作品模板", desc: "作品编号、名称、所属序、售价等" },
  { type: "bom",          label: "BOM模板",       desc: "作品编号、材料编码、用量等" },
  { type: "costs",        label: "成本核算模板", desc: "作品编号、材料成本、人工、包装等" },
  { type: "inventory",    label: "库存模板",     desc: "材料编码、采购数量、已使用等" },
];

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.name.endsWith(".xlsx") || f.name.endsWith(".xls")) {
      setFile(f);
      setResult(null);
    } else {
      setResult({ error: "请上传 .xlsx 或 .xls 格式的 Excel 文件" });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "上传失败，请重试" });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async (type: string) => {
    const res = await fetch(`/api/import/template?type=${type}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>数据导入</h1>
        <p style={{ color: "var(--ink-light)", marginTop: 4 }}>
          下载模板 → 填写数据 → 上传导入。支持「允物品牌经营系统」V1/V3 格式。
        </p>
      </div>

      {/* 模板下载 */}
      <div className="bg-[var(--paper)] rounded-xl border border-[var(--border)] p-5">
        <h2 className="font-semibold text-sm mb-3" style={{ color: "var(--ink)" }}>下载导入模板</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {templates.map((t) => (
            <button
              key={t.type}
              onClick={() => downloadTemplate(t.type)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-[var(--border)] hover:bg-[rgba(245,240,230,0.5)] transition text-center"
            >
              <Download size={18} style={{ color: "#b45309" }} />
              <span className="text-xs font-medium" style={{ color: "var(--ink)" }}>{t.label}</span>
              <span className="text-[11px]" style={{ color: "var(--ink-light)" }}>{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 上传区域 */}
      <div
        className={`bg-[var(--paper)] rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-[#b45309] bg-[rgba(180,83,9,0.04)]"
            : file
            ? "border-green-300 bg-green-50/30"
            : "border-[var(--border)] hover:border-[var(--zhu)] hover:bg-[rgba(245,240,230,0.3)]"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {!file && (
          <>
            <Upload size={40} className="mx-auto mb-4" style={{ color: "var(--ink-light)" }} />
            <p className="font-medium" style={{ color: "var(--ink)" }}>点击或拖拽文件至此处</p>
            <p className="text-sm mt-1" style={{ color: "var(--ink-light)" }}>支持 .xlsx / .xls</p>
          </>
        )}
        {file && (
          <>
            <FileSpreadsheet size={40} className="mx-auto mb-4 text-green-600" />
            <p className="font-medium" style={{ color: "var(--ink)" }}>{file.name}</p>
            <p className="text-sm mt-1" style={{ color: "var(--ink-light)" }}>{(file.size / 1024).toFixed(1)} KB</p>
          </>
        )}
      </div>

      {/* 导入按钮 */}
      {file && (
        <div className="flex justify-center gap-3">
          <button
            onClick={handleUpload}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-medium text-white transition"
            style={{ background: loading ? "#9ca3af" : "#b45309" }}
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> 正在导入...</>
            ) : (
              <><Upload size={18} /> 开始导入</>
            )}
          </button>
          <button
            onClick={() => { setFile(null); setResult(null); }}
            className="px-6 py-3 rounded-lg text-sm border"
            style={{ borderColor: "var(--border)", color: "var(--ink-light)" }}
          >取消</button>
        </div>
      )}

      {/* 结果 */}
      {result && (
        <div className={`rounded-xl p-5 border ${
          result.error
            ? "bg-red-50 border-red-200"
            : "bg-green-50 border-green-200"
        }`}>
          <div className="flex items-start gap-3">
            {result.error ? (
              <AlertCircle size={22} className="text-red-600 mt-0.5" />
            ) : (
              <CheckCircle2 size={22} className="text-green-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${
                result.error ? "text-red-800" : "text-green-800"
              }`}>
                {result.error ? `导入失败：${result.error}` : "导入完成！"}
              </p>
              {result.log && result.log.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm" style={{ color: "var(--ink-light)" }}>
                  {result.log.map((msg, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full mt-0.5 flex-shrink-0" style={{ background: "var(--zhu)" }}></span>
                      {msg}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 导入说明 */}
      <div className="bg-[var(--paper)] rounded-xl border border-[var(--border)] p-6">
        <h3 className="font-semibold mb-3" style={{ color: "var(--ink)" }}>导入说明</h3>
        <ul className="space-y-2 text-sm" style={{ color: "var(--ink-light)" }}>
          <li>• 系统会自动识别 Excel 中的 Sheet：原料采购库、作品BOM库、作品成本库、库存池、七序作品库</li>
          <li>• 导入时会覆盖同名编码的数据（以最新为准）</li>
          <li>• 建议先下载模板，按模板格式填写后再上传</li>
          <li>• 首次导入建议先导入「原材料」，再导入「七序作品」，最后导入「BOM」和「成本」</li>
        </ul>
      </div>
    </div>
  );
}
