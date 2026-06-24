/**
 * Platform Dashboard — WO-P8F
 * Wrapped in AdminShell to show Sidebar.
 */
import AdminShell from "@/components/AdminShell";

export default function DashboardPage() {
  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-2xl md:text-3xl font-light tracking-[0.1em] text-stone-800 mb-3">
          允物 Platform OS
        </h1>
        <p className="text-stone-500 text-sm tracking-wider">
          WO-P8F · vP8F · Direct Routing Test
        </p>
        <div className="mt-8 p-6 bg-white/60 border border-stone-200/60 rounded-2xl">
          <p className="text-stone-600">Dashboard content loading...</p>
        </div>
      </div>
    </AdminShell>
  );
}
