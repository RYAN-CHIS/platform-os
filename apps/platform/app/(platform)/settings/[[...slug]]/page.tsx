/**
 * Settings Proxy Page
 *
 * Routes to ERP or Brand OS depending on the specific settings page.
 * Middleware handles the actual routing.
 */

export default function SettingsProxyFallback() {
  return (
    <div className="flex items-center justify-center py-40">
      <div className="text-center">
        <div className="animate-pulse text-4xl mb-4">⏳</div>
        <p className="text-stone-500 text-sm">正在加载设置模块...</p>
      </div>
    </div>
  );
}
