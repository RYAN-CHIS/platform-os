import AdminShell from "@/components/AdminShell";
import { ToastProvider } from "@/components/toast";

/**
 * Platform Layout — wraps all admin pages with AdminShell (Sidebar + MainArea)
 */
export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  );
}
