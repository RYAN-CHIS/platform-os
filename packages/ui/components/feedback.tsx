import { type ReactNode } from "react";
import { cn } from "../utils";

// ═══════════════════════════════════════════
// Permission UX — unified visual feedback
// ═══════════════════════════════════════════

interface PermissionDeniedProps { permission?: string; message?: string; className?: string; }
export function PermissionDenied({ permission, message, className }: PermissionDeniedProps) {
  return (
    <div className={cn("flex items-center justify-center py-20", className)}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-stone-100 flex items-center justify-center">
          <span className="text-2xl">🔒</span>
        </div>
        <h3 className="text-lg font-medium text-stone-700 mb-2">权限不足</h3>
        <p className="text-sm text-stone-500 leading-relaxed">
          {message || "您没有访问此功能的权限"}
        </p>
        {permission && (
          <p className="text-xs text-stone-400 mt-3 font-mono">
            需要权限: <code className="bg-stone-100 px-1.5 py-0.5 rounded">{permission}</code>
          </p>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps { icon?: string; title: string; description?: string; action?: ReactNode; }
export function EmptyState({ icon = "📭", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="text-lg font-medium text-stone-600 mb-1">{title}</h3>
      {description && <p className="text-sm text-stone-400 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

interface LoadingStateProps { rows?: number; }
export function LoadingState({ rows = 3 }: LoadingStateProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-stone-200 p-6 animate-pulse">
          <div className="h-4 bg-stone-200 rounded w-1/4 mb-3" />
          <div className="h-3 bg-stone-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message = "加载失败", retry }: { message?: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-4">⚠️</span>
      <h3 className="text-lg font-medium text-stone-600 mb-1">{message}</h3>
      {retry && (
        <button onClick={retry} className="mt-4 px-4 py-2 text-sm bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
          重试
        </button>
      )}
    </div>
  );
}
