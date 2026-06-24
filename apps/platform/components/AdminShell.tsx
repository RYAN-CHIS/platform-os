"use client";

import { ReactNode, Suspense } from "react";
import PlatformSidebar from "./PlatformSidebar";

interface AdminShellProps {
  children: ReactNode;
}

/**
 * AdminShell — 统一管理后台框架
 *
 * 布局: Sidebar (固定左侧) + MainArea (右侧滚动)
 * 响应式: 移动端 Sidebar 抽屉式
 */
export default function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="flex min-h-screen bg-[#f8f4ef]">
      {/* Sidebar — fixed, handles its own responsive behavior */}
      <Suspense fallback={
        <aside className="w-60 min-h-screen bg-stone-900" />
      }>
        <PlatformSidebar />
      </Suspense>

      {/* Main content area */}
      <main className="flex-1 lg:pl-60 min-h-screen">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
