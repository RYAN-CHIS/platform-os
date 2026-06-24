import { listRoles, seedStandardRoles } from "@/modules/settings/roles/actions";
import RolesClient from "./client";

export default async function SettingsRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let roles: Awaited<ReturnType<typeof listRoles>> = [];

  try {
    // Ensure standard roles exist (idempotent, runs on every load)
    await seedStandardRoles();
    roles = await listRoles(q);
  } catch {}

  return <RolesClient initialRoles={roles} />;
}
