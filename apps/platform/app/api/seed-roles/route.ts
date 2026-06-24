/**
 * API Route: /api/seed-roles
 * One-time migration endpoint — ensures 7 standard roles exist in DB.
 * Call this after deployment to seed roles without logging into the UI.
 */
import { NextResponse } from "next/server";
import { seedStandardRoles } from "@/modules/settings/roles/actions";

export async function GET() {
  try {
    const result = await seedStandardRoles();
    return NextResponse.json({
      ok: true,
      message: `Migrated: ${result.migrated}, Seeded: ${result.seeded}, Permissions set: ${result.permissionsSet}`,
      result,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
