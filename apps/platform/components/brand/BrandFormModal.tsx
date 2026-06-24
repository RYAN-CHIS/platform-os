"use client";
/**
 * BrandFormModal — Unified Brand OS modal system
 * Fixed header/body/footer, 900-1080px, max 80vh, ESC to close
 */
import { useEffect, useRef, type ReactNode } from "react";

export interface BrandFormModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  width?: number;
}

export function BrandFormModal({
  open, title, children, footer, onClose, width = 960,
}: BrandFormModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{
        display: "flex", flexDirection: "column",
        background: "#fff", borderRadius: 12,
        width: "100%", maxWidth: width, maxHeight: "80vh",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        overflow: "hidden",
      }}>
        {/* Fixed Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid #e7e5e4",
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: 16, color: "#1c1917", letterSpacing: "0.02em" }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", fontSize: 20, cursor: "pointer",
              color: "#a8a29e", lineHeight: 1, padding: "2px 8px", borderRadius: 4,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f4")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "20px 24px",
        }}>
          {children}
        </div>

        {/* Fixed Footer */}
        {footer && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 24px", borderTop: "1px solid #e7e5e4",
            flexShrink: 0, background: "#fafaf9",
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
