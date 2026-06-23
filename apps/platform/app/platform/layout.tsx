import AdminShell from "@/components/AdminShell";

/**
 * Real /platform route layout.
 *
 * The dashboard must live under app/platform instead of relying on a route
 * group to claim the root URL.
 */
export default function PlatformDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
