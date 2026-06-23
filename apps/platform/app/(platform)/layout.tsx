import AdminShell from "@/components/AdminShell";

/**
 * Platform Layout — wraps all admin pages with AdminShell (Sidebar + MainArea)
 */
export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
