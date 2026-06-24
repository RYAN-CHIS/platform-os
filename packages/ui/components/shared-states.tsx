"use client";

import * as React from "react";
import { Button } from "./button";

/**
 * Shared UI States — Loading / Empty / Error / Confirm
 * WO-P8A: Recovered from Legacy Platform UI.
 */

/* ---------- Skeleton Loaders ---------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-stone-200 ${className}`} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="border-b border-stone-100 px-4 py-3"><div className="flex gap-4">{Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-4 flex-1" />)}</div></div>
      <div className="divide-y divide-stone-50">{Array.from({ length: rows }).map((_, ri) => <div key={ri} className="flex gap-4 px-4 py-3.5">{Array.from({ length: cols }).map((_, ci) => <Skeleton key={ci} className="h-4 flex-1" />)}</div>)}</div>
    </div>
  );
}

export function CardSkeleton() {
  return <div className="rounded-xl border border-stone-200 bg-white p-5"><Skeleton className="h-4 w-24" /><Skeleton className="mt-3 h-8 w-32" /><div className="mt-4 flex gap-4"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-16" /></div></div>;
}

/* ---------- Empty State (enhanced) ---------- */

export interface EmptyTemplate { title: string; desc: string; href?: string; onClick?: () => void; }

export function EmptyState({ icon = "📄", title, desc, action }: {
  icon?: string; title: string; desc?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-white py-16 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-50 text-2xl">{icon}</div>
      <h3 className="mt-4 text-sm font-semibold text-stone-700">{title}</h3>
      {desc && <p className="mt-1 max-w-xs text-xs text-stone-400">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- Error State ---------- */

export function ErrorState({ title = "加载失败", desc, onRetry }: {
  title?: string; desc?: string; onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/30 py-16 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-stone-700">{title}</h3>
      {desc && <p className="mt-1 max-w-xs text-xs text-stone-400">{desc}</p>}
      {onRetry && <button onClick={onRetry} className="mt-4 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 hover:bg-stone-50">重新加载</button>}
    </div>
  );
}

/* ---------- Page Loader Wrapper ---------- */

export function PageLoader({ loading, error, onRetry, children }: {
  loading: boolean; error?: string | null; onRetry?: () => void; children: React.ReactNode;
}) {
  if (error) return <ErrorState title="加载失败" desc={error} onRetry={onRetry} />;
  if (loading) return <div className="space-y-4">{children}</div>;
  return <>{children}</>;
}

/* ---------- Submit Button ---------- */

export function SubmitButton({ loading, children, onClick, disabled, variant = "primary", size = "sm" }: {
  loading: boolean; children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: "primary" | "ghost"; size?: "sm" | "md";
}) {
  return <Button variant={variant} size={size} loading={loading} onClick={onClick} disabled={disabled || loading}>{children}</Button>;
}
