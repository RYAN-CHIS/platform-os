import { listUsers } from "@/modules/settings/users/actions";
import { listRolesForSelect } from "@/modules/settings/roles/actions";
import UsersClient from "./client";

export default async function SettingsUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let users: Awaited<ReturnType<typeof listUsers>> = [];

  try {
    users = await listUsers(q);
  } catch {}

  // Fetch role options from roles table (unified with role management)
  let roleOptions: { value: string; label: string }[] = [];
  try {
    roleOptions = await listRolesForSelect();
  } catch {}

  return <UsersClient initialUsers={users} roleOptions={roleOptions} />;
}
