"use client";

import { useState, useRef } from "react";
import {
  listMedia,
  updateMediaAsset,
  deleteMediaAsset,
  bulkDeleteMedia,
} from "@/modules/brand/media/actions";
import { MEDIA_MENU_GROUPS } from "@/modules/brand/media/config";
import ErpToolbar from "@/components/ErpToolbar";
import ErpDataTable from "@/components/ErpDataTable";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg", "mp4", "mov", "webm", "pdf", "csv", "xlsx", "zip"]);
const ALLOWED_MIME_PREFIXES = ["image/", "video/"];
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
]);

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}

function parseMenuGroup(tags: string | null): string {
  try {
    return JSON.parse(tags || "{}").menuGroup || "other";
  } catch {
    return "other";
  }
}

function getMenuLabel(value: string): string {
  return MEDIA_MENU_GROUPS.find((m) => m.value === value)?.label || value;
}

function getTypeIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("spreadsheet") || mimeType === "text/csv") return "📊";
  if (mimeType.includes("zip")) return "📦";
  return "📁";
}

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

function validateFile(file: File): string | null {
  if (file.size <= 0) return "文件为空";
  if (file.size > MAX_UPLOAD_SIZE) return "文件超过10MB";

  const ext = getFileExtension(file.name);
  const mime = file.type;
  const mimeAllowed = ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix)) || ALLOWED_MIME_TYPES.has(mime);
  if (!mimeAllowed && !ALLOWED_EXTENSIONS.has(ext)) {
    return `不支持 ${ext ? ext.toUpperCase() : mime || "未知"} 文件`;
  }

  return null;
}

async function parseUploadResponse(res: Response) {
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    throw new Error(body?.error || `上传接口 ${res.status}`);
  }
  if (!body) {
    throw new Error("上传接口返回为空");
  }
  if (body.error) {
    throw new Error(body.error);
  }
  if (!body.url || !body.filename || !body.originalName || !body.mimeType || !body.size) {
    throw new Error("上传接口返回内容不完整");
  }
  if (!body.asset?.id) {
    throw new Error("素材记录保存失败");
  }
  return body;
}

export default function BrandMediaClient({ initialRows }: { initialRows: any[] }) {
  const [rows, setRows] = useState(initialRows);
  const [mediaFilter, setMediaFilter] = useState("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadMenuGroup, setUploadMenuGroup] = useState("other");
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const r = await listMedia();
    if (r.error) setToast({ message: r.error, type: "error" });
    else setRows(r.rows);
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    let success = 0;
    const errors: string[] = [];

    for (const file of uploadFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("menuGroup", uploadMenuGroup);

      try {
        const res = await fetch("/api/media/upload", { method: "POST", body: formData });
        await parseUploadResponse(res);
        success++;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "上传失败";
        errors.push(`${file.name}: ${reason}`);
      }
    }

    setUploading(false);
    if (success > 0) {
      setUploadOpen(false);
      setUploadFiles([]);
    }
    await refresh();
    if (errors.length > 0) {
      setToast({ message: `上传失败：${errors[0]}${errors.length > 1 ? `（另有 ${errors.length - 1} 个失败）` : ""}`, type: "error" });
    } else if (success > 0) {
      setToast({ message: `成功上传 ${success} 个文件`, type: "success" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此素材？")) return;
    const r = await deleteMediaAsset(id);
    if (r.error) {
      if (r.refCount) {
        setToast({ message: r.error, type: "error" });
      } else {
        setToast({ message: r.error, type: "error" });
      }
    } else {
      setToast({ message: "已删除", type: "success" });
      refresh();
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定删除 ${selected.size} 个素材？`)) return;
    const r = await bulkDeleteMedia(Array.from(selected));
    const failed = r.results.filter((x) => x.error);
    setToast({ message: `删除 ${r.results.length - failed.length}/${r.results.length} 个`, type: failed.length > 0 ? "error" : "success" });
    setSelected(new Set());
    refresh();
  };

  const handleEdit = async () => {
    if (!editRow) return;
    await updateMediaAsset(editRow.id, { menuGroup: editRow.menuGroup });
    setEditOpen(false);
    refresh();
    setToast({ message: "已更新归属", type: "success" });
  };

  const mediaTypeFilters = [
    { label: "全部", value: "all" },
    { label: "图片", value: "IMAGE" },
    { label: "视频", value: "VIDEO" },
    { label: "文档", value: "DOCUMENT" },
  ];

  // Client-side filter
  const filteredRows = mediaFilter === "all" ? rows : rows.filter((r: any) => {
    if (mediaFilter === "IMAGE") return (r.mimeType || "").startsWith("image/");
    if (mediaFilter === "VIDEO") return (r.mimeType || "").startsWith("video/");
    if (mediaFilter === "DOCUMENT") return !(r.mimeType || "").startsWith("image/") && !(r.mimeType || "").startsWith("video/");
    return true;
  });

  const columns = [
    {
      key: "preview",
      label: "预览",
      width: "60px",
      render: (_: any, row: any) =>
        row.mimeType?.startsWith("image/") ? (
          <img src={row.url} alt={row.originalName} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
        ) : (
          <span style={{ fontSize: 24 }}>{getTypeIcon(row.mimeType || "")}</span>
        ),
    },
    { key: "originalName", label: "文件名", sortable: true },
    {
      key: "menuGroup",
      label: "所属菜单",
      render: (_: any, row: any) => getMenuLabel(parseMenuGroup(row.tags)),
    },
    {
      key: "mimeType",
      label: "类型",
      width: "80px",
      render: (val: string) => val?.split("/")[1]?.toUpperCase() || val,
    },
    {
      key: "size",
      label: "大小",
      width: "80px",
      sortable: true,
      render: (val: number) => formatSize(val),
    },
    {
      key: "createdAt",
      label: "上传时间",
      width: "140px",
      sortable: true,
      render: (val: string) => new Date(val).toLocaleString("zh-CN"),
    },
    {
      key: "actions",
      label: "操作",
      width: "200px",
      render: (_: any, row: any) => (
        <div style={{ display: "flex", gap: 4 }}>
          <a href={row.url} target="_blank" style={{ padding: "3px 8px", border: "1px solid #e7e5e4", borderRadius: 4, fontSize: 12, color: "#57534e", textDecoration: "none" }}>
            预览
          </a>
          <a href={row.url} download style={{ padding: "3px 8px", border: "1px solid #e7e5e4", borderRadius: 4, fontSize: 12, color: "#57534e", textDecoration: "none" }}>
            下载
          </a>
          <button
            onClick={() => {
              setEditRow({ ...row, menuGroup: parseMenuGroup(row.tags) });
              setEditOpen(true);
            }}
            style={{ padding: "3px 8px", border: "1px solid #e7e5e4", borderRadius: 4, fontSize: 12, background: "#fff", cursor: "pointer" }}
          >
            归属
          </button>
          <button onClick={() => handleDelete(row.id)} style={{ padding: "3px 8px", border: "1px solid #ef4444", borderRadius: 4, fontSize: 12, background: "#fff", color: "#ef4444", cursor: "pointer" }}>
            删除
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {toast && (
        <div
          onClick={() => setToast(null)}
          style={{ position: "fixed", top: 16, right: 16, padding: "8px 16px", borderRadius: 8, zIndex: 100, cursor: "pointer", background: toast.type === "error" ? "#fee2e2" : "#dcfce7", color: toast.type === "error" ? "#dc2626" : "#16a34a", fontSize: 13 }}
        >
          {toast.message}
        </div>
      )}

      <ErpToolbar
        title="媒体素材管理"
        subtitle="Brand OS · 图片 / 视频 / 文档"
        total={filteredRows.length}
        entityLabel="个素材"
        searchPlaceholder="搜索文件名..."
        onRefresh={refresh}
        onAdd={() => setUploadOpen(true)}
        filterOptions={mediaTypeFilters}
        activeFilter={mediaFilter}
        onFilterChange={setMediaFilter}
        extraButtons={
          selected.size > 0 ? (
            <button onClick={handleBulkDelete} style={{ padding: "6px 12px", border: "1px solid #ef4444", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#fff", color: "#ef4444" }}>
              删除选中 ({selected.size})
            </button>
          ) : undefined
        }
      />

      <ErpDataTable columns={columns} rows={filteredRows} emptyText="暂无媒体素材，点击右上角上传" />

      {/* Upload Modal */}
      {uploadOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 8, width: 500, padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>上传媒体素材</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "#78716c", display: "block", marginBottom: 6 }}>归属菜单</label>
              <select
                value={uploadMenuGroup}
                onChange={(e) => setUploadMenuGroup(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #e7e5e4", borderRadius: 4, fontSize: 13 }}
              >
                {MEDIA_MENU_GROUPS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setUploadFiles(Array.from(e.dataTransfer.files || []));
              }}
              style={{ border: "2px dashed #e7e5e4", borderRadius: 8, padding: 32, textAlign: "center", cursor: "pointer", marginBottom: 12, color: "#78716c", fontSize: 13 }}
            >
              {uploadFiles.length > 0 ? (
                <div>
                  <p>已选择 {uploadFiles.length} 个文件</p>
                  {uploadFiles.map((f) => (
                    <div key={f.name} style={{ fontSize: 11, color: "#a8a29e" }}>{f.name} ({formatSize(f.size)})</div>
                  ))}
                </div>
              ) : (
                <>
                  <p>拖拽文件到此处，或点击选择</p>
                  <p style={{ fontSize: 11, marginTop: 4 }}>支持 JPG/PNG/WebP/GIF/SVG/MP4/PDF/CSV/XLSX/ZIP</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.csv,.xlsx,.zip"
              style={{ display: "none" }}
              onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setUploadOpen(false); setUploadFiles([]); }} style={{ padding: "8px 16px", border: "1px solid #e7e5e4", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13 }}>
                取消
              </button>
              <button onClick={handleUpload} disabled={uploading || uploadFiles.length === 0} style={{ padding: "8px 16px", background: uploading ? "#a8a29e" : "#292524", color: "#fff", border: "none", borderRadius: 6, cursor: uploading ? "default" : "pointer", fontSize: 13 }}>
                {uploading ? "上传中..." : `上传 ${uploadFiles.length} 个文件`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Menu Modal */}
      {editOpen && editRow && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 8, width: 380, padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>编辑归属 — {editRow.originalName}</h3>
            <select
              value={editRow.menuGroup}
              onChange={(e) => setEditRow({ ...editRow, menuGroup: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #e7e5e4", borderRadius: 4, fontSize: 13 }}
            >
              {MEDIA_MENU_GROUPS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setEditOpen(false)} style={{ padding: "8px 16px", border: "1px solid #e7e5e4", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13 }}>取消</button>
              <button onClick={handleEdit} style={{ padding: "8px 16px", background: "#292524", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
