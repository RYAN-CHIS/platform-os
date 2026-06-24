import { listAuditLogs, getEntityTypes, getAuditUsers, getSystems } from "@/modules/settings/audit/actions";
import AuditClient from "./client";

export default async function SettingsAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; module?: string; userId?: string; action?: string; from?: string; to?: string; system?: string; targetId?: string }>;
}) {
  const params = await searchParams;
  const filter = {
    q: params.q,
    module: params.module,
    userId: params.userId ? Number(params.userId) : undefined,
    action: params.action,
    from: params.from,
    to: params.to,
    system: params.system,
    targetId: params.targetId,
  };

  let logs: Awaited<ReturnType<typeof listAuditLogs>> = [];
  let entityTypes: string[] = [];
  let auditUsers: { id: number; name: string | null; email: string }[] = [];
  let systems: string[] = [];

  try {
    [logs, entityTypes, auditUsers, systems] = await Promise.all([
      listAuditLogs(filter),
      getEntityTypes(),
      getAuditUsers(),
      getSystems(),
    ]);
  } catch {}

  return <AuditClient initialLogs={logs} entityTypes={entityTypes} auditUsers={auditUsers} systems={systems} currentFilter={filter} />;
}
