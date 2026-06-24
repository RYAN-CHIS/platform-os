"use client";
/**
 * BrandFormSection — Section block with title + divider for Brand form modals
 */
import type { ReactNode } from "react";

export interface BrandFormSectionProps {
  title: string;
  children: ReactNode;
  description?: string;
}

export function BrandFormSection({ title, children, description }: BrandFormSectionProps) {
  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{
          fontSize: 14, fontWeight: 600, color: "#292524",
          letterSpacing: "0.02em", margin: 0,
        }}>
          {title}
        </h3>
        {description && (
          <p style={{ fontSize: 12, color: "#a8a29e", margin: "2px 0 0" }}>{description}</p>
        )}
        <div style={{
          marginTop: 8, height: 1, background: "linear-gradient(to right, #e7e5e4 0%, #f5f5f4 100%)",
        }} />
      </div>

      {/* Section body - 2 column grid for desktop */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "12px 20px",
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Single field wrapper (full width row) ──
export function BrandFormRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ gridColumn: "1 / -1" }}>{children}</div>
  );
}

// ── Label + input helper ──
export interface BrandFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

export function BrandField({ label, required, error, children }: BrandFieldProps) {
  return (
    <div style={{ marginBottom: 2 }}>
      <label style={{
        display: "block", fontSize: 12, color: "#57534e", marginBottom: 4, fontWeight: 500,
      }}>
        {label}
        {required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: 11, color: "#dc2626", margin: "2px 0 0" }}>{error}</p>
      )}
    </div>
  );
}

// ── Input primitives ──
const BASE_INPUT: React.CSSProperties = {
  width: "100%", height: 36, padding: "0 10px",
  border: "1px solid #d6d3d1", borderRadius: 6, fontSize: 13,
  outline: "none", background: "#fff", boxSizing: "border-box",
  fontFamily: "inherit", transition: "border-color 0.15s",
};

export function BrandInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label: _label, ...rest } = props;
  return (
    <input
      {...rest}
      style={{ ...BASE_INPUT, ...rest.style as React.CSSProperties }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "#292524"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "#d6d3d1"; }}
    />
  );
}

export function BrandTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const { label: _label, ...rest } = props;
  return (
    <textarea
      {...rest}
      style={{
        ...BASE_INPUT, height: "auto", minHeight: 80, padding: "8px 10px",
        resize: "vertical", lineHeight: 1.5, ...rest.style as React.CSSProperties,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "#292524"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "#d6d3d1"; }}
    />
  );
}

export function BrandSelect(props: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { label: string; value: string }[];
}) {
  const { label: _label, options, ...rest } = props;
  return (
    <select
      {...rest}
      style={{
        ...BASE_INPUT, cursor: "pointer", appearance: "auto" as any,
        ...rest.style as React.CSSProperties,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "#292524"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "#d6d3d1"; }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function BrandNumberInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label: _label, ...rest } = props;
  return (
    <input
      type="number"
      {...rest}
      style={{
        ...BASE_INPUT,
        MozAppearance: "textfield",
        ...rest.style as React.CSSProperties,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "#292524"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "#d6d3d1"; }}
    />
  );
}
