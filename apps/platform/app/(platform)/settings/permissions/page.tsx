import { getPermissionMatrix } from "@/modules/settings/permissions/actions";
import PermissionsClient from "./client";

export default async function SettingsPermissionsPage() {
  let matrix: Awaited<ReturnType<typeof getPermissionMatrix>> = { roles: [], modules: [] };

  try {
    matrix = await getPermissionMatrix();
  } catch {}

  return <PermissionsClient initialRoles={matrix.roles} modules={matrix.modules} />;
}
