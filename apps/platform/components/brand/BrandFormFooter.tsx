"use client";
/**
 * BrandFormFooter — Fixed bottom button bar for Brand form modals
 * Left: cancel button
 * Right: save draft / save / publish
 */
interface BrandFormFooterProps {
  /** Cancel handler */
  onCancel: () => void;
  /** Save draft handler (optional) */
  onSaveDraft?: () => void | Promise<void>;
  /** Save handler */
  onSave: () => void | Promise<void>;
  /** Publish handler (optional) */
  onPublish?: () => void | Promise<void>;
  /** Loading state */
  saving?: boolean;
  /** Current status (for showing publish vs save) */
  status?: string;
  /** Custom save label */
  saveLabel?: string;
  /** Disable save button */
  disableSave?: boolean;
}

export function BrandFormFooter({
  onCancel, onSaveDraft, onSave, onPublish,
  saving = false, saveLabel = "保存", disableSave,
}: BrandFormFooterProps) {
  return (
    <>
      {/* Left: cancel */}
      <button type="button" onClick={onCancel} style={btnStyle("secondary")} disabled={saving}>
        取消
      </button>

      {/* Right: action buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        {onSaveDraft && (
          <button type="button" onClick={onSaveDraft} disabled={saving} style={btnStyle("draft")}>
            {saving ? "保存中…" : "保存草稿"}
          </button>
        )}
        {onPublish && (
          <button type="button" onClick={onPublish} disabled={saving || disableSave} style={btnStyle("publish")}>
            {saving ? "发布中…" : "发布"}
          </button>
        )}
        <button type="button" onClick={onSave} disabled={saving || disableSave} style={btnStyle("primary")}>
          {saving ? "保存中…" : saveLabel}
        </button>
      </div>
    </>
  );
}

function btnStyle(variant: "primary" | "secondary" | "draft" | "publish"): React.CSSProperties {
  const base: React.CSSProperties = {
    height: 36, padding: "0 16px", borderRadius: 6, fontSize: 13,
    cursor: "pointer", border: "1px solid", fontWeight: 400,
    whiteSpace: "nowrap", transition: "opacity 0.15s",
    opacity: 1,
  };
  switch (variant) {
    case "primary":
      return { ...base, background: "#292524", color: "#fff", borderColor: "#292524" };
    case "secondary":
      return { ...base, background: "#fff", color: "#44403c", borderColor: "#d6d3d1" };
    case "draft":
      return { ...base, background: "#fafaf9", color: "#78716c", borderColor: "#e7e5e4" };
    case "publish":
      return { ...base, background: "#059669", color: "#fff", borderColor: "#059669" };
  }
}
