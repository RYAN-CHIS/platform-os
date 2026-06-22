# Migration Policy — Phase 4.5.1 (Schema Locked)

## Rules

1. **All schema changes MUST go through migration files.**
   Command: `pnpm --filter @yunwu/db db:migrate`

2. **No inline schema edits in app layer.**
   `apps/*/prisma/` directories are FROZEN. Only `packages/db/schema.prisma` is active.

3. **Every migration must declare:**
   - Domain ownership (erp | brand | shared)
   - Backward compatibility impact
   - Rollback plan

4. **Cross-domain relations require explicit approval.**
   Must be declared in `schema-lock.json` → `domains` before migration.

## Forbidden

- ❌ Direct schema edits (`.prisma` file manual changes without migration)
- ❌ Ad-hoc table creation (`CREATE TABLE` outside migration)
- ❌ Cross-domain implicit relations (foreign keys between erp.* and brand.* without declaration)
- ❌ New models without migration proposal
- ❌ Field type changes without backward-compat review

## Migration Workflow

```
1. Edit packages/db/schema.prisma
2. Run: pnpm --filter @yunwu/db db:migrate
3. Review generated migration SQL
4. Test: pnpm build (all apps)
5. Commit migration + schema change together
```

## Rollback

```
pnpm --filter @yunwu/db prisma migrate down 1
```
