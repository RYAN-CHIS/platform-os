import { type ReactNode } from "react";
import { cn } from "../utils";

interface CardProps { children: ReactNode; className?: string; hover?: boolean; padding?: "sm" | "md" | "lg"; }
export function Card({ children, className, hover = false, padding = "md" }: CardProps) {
  const pads = { sm: "p-4", md: "p-6", lg: "p-8" };
  return (
    <div className={cn("bg-white rounded-2xl border border-stone-200/60", pads[padding], hover && "hover:shadow-md transition-shadow duration-200", className)}>
      {children}
    </div>
  );
}

interface StatCardProps { icon: ReactNode; label: string; value: number | string; href?: string; color?: "amber" | "blue" | "emerald" | "purple"; }
export function StatCard({ icon, label, value, href, color = "amber" }: StatCardProps) {
  const borders: Record<string, string> = { amber: "border-l-amber-400", blue: "border-l-blue-400", emerald: "border-l-emerald-400", purple: "border-l-purple-400" };
  const content = (
    <div className="bg-white rounded-xl border border-stone-200 border-l-4 p-4 hover:shadow-sm transition-shadow">
      <div className={`${borders[color]} -ml-4 pl-4`}>
        <div className="flex items-center gap-2 text-stone-400 mb-1">{icon}<span className="text-xs">{label}</span></div>
        <p className="text-2xl font-semibold text-stone-800">{value}</p>
      </div>
    </div>
  );
  return href ? <a href={href}>{content}</a> : content;
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
