"use client";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-stone-800 text-white hover:bg-stone-700 border-transparent",
  secondary: "bg-stone-100 text-stone-700 hover:bg-stone-200 border-stone-200",
  outline: "bg-white text-stone-700 hover:bg-stone-50 border-stone-300",
  ghost: "bg-transparent text-stone-600 hover:bg-stone-100 border-transparent",
  danger: "bg-red-600 text-white hover:bg-red-700 border-transparent",
};
const sizes: Record<Size, string> = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, disabled, children, ...props }, ref) => (
    <button ref={ref} disabled={disabled || loading} className={cn(
      "inline-flex items-center justify-center gap-2 rounded-lg border font-medium tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed",
      variants[variant], sizes[size], className
    )} {...props}>
      {loading && <Spinner />}{children}
    </button>
  )
);
Button.displayName = "Button";

function Spinner() { return <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>; }
