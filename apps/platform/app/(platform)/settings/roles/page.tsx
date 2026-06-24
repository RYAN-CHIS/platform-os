import { listRoles } from "@/modules/settings/roles/actions";
import RolesClient from "./client";

export default async function SettingsRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let roles: Awaited<ReturnType<typeof listRoles>> = [];

  try {
    roles = await listRoles(q);
  } catch {}

  return <RolesClient initialRoles={roles} />;
}
