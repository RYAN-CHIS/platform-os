# ADR-007 — Legacy Storefront Decommission and Production Storefront Ownership

**Status:** ACCEPTED
**Date:** 2026-07-14

## Decision

`/Users/ryan/Projects/active/yunwu-origin` is the only production Storefront. The tracked legacy `platform-os/apps/web` application is decommissioned from the source tree, workspace/install and build graphs, CI, Vercel build target, and deployment surface.

The pre-decommission state is preserved by Git history and the annotated tag `pre-apps-web-decommission-2026-07-14`. The deletion does not migrate its Prisma schema or migrations into `packages/db/schema.prisma` or `packages/brand-db/schema.prisma`, and `apps/web` must not be recreated or re-enabled.

## Consequences

- Root deployment configuration targets `@yunwu/platform-app`; this phase neither changes a Vercel project nor deploys.
- Removal of the tracked working-tree `DEPLOY_SETUP.md` eliminates its two secrets-gate findings, but does not rotate credentials or remediate Git-history secrets.
- Existing ERP historical secrets debt remains independently governed.
- Production Storefront code and deployment in `yunwu-origin` are out of scope and unchanged.
