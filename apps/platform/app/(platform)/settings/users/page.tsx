import { listUsers } from "@/modules/settings/users/actions";
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

  return <UsersClient initialUsers={users} />;
}
