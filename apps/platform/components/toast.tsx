"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (opts: { message: string; type?: ToastType }) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ message, type = "info" }: { message: string; type?: ToastType }) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen for toast events from outside React components
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.message) toast(detail);
    }
    window.addEventListener("yunwu-toast", handler);
    return () => window.removeEventListener("yunwu-toast", handler);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      {/* Toast container */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map((t) => (
          <div key={t.id} onClick={() => dismiss(t.id)} style={{
            padding: "10px 16px", borderRadius: 8, fontSize: 13, color: "#fff", cursor: "pointer",
            background: t.type === "success" ? "#059669" : t.type === "error" ? "#dc2626" : "#2563eb",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Standalone toast function (works outside React components)
export function toast(opts: { message: string; type?: ToastType }) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("yunwu-toast", { detail: opts }));
  }
}

// Hook for use inside React components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
