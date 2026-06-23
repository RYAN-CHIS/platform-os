/**
 * Brand OS Proxy Page
 *
 * Middleware handles the actual proxying to Brand OS app (port 3003).
 * This page is a fallback for when the proxy target is unreachable.
 */

export default function BrandProxyFallback() {
  return (
    <div className="flex items-center justify-center py-40">
      <div className="text-center">
        <div className="animate-pulse text-4xl mb-4">⏳</div>
        <p className="text-stone-500 text-sm">正在加载 Brand OS 模块...</p>
        <p className="text-stone-400 text-xs mt-2">
          请确保 Brand OS 服务已启动 (端口 3003)
        </p>
      </div>
    </div>
  );
}
