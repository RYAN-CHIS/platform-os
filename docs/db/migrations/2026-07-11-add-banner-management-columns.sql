-- =============================================================================
-- Migration: 2026-07-11 — Add Banner management columns
-- =============================================================================
-- Target database : Brand DB `neondb` @ ep-morning-sun-aoo4dk3t (ap-southeast-1)
-- Affected table  : public.banners
-- Author          : WorkBuddy (Ryan) — Banner 统一管理闭环 (follow-up 补验)
-- Related tickets : Banner Source Audit / Banner 统一管理闭环
--
-- Purpose
-- -------
-- Extend the `banners` table so the Brand OS Banner 管理 page and the
-- storefront (yunwu-origin) unified Banner reader (src/lib/banners.ts) can
-- store and serve operation-managed visual banners:
--
--   published_at     : timestamp set when a banner is published (used by the
--                      publisher workflow transitionStatus()). Previously the
--                      publish UPDATE referenced this column but it did not
--                      exist -> runtime error. Now persisted.
--   subtitle         : secondary line shown under the title on the banner.
--   btn_text         : Call-To-Action label (e.g. "查看七序").
--   mobile_image_url : image used on mobile viewports; storefront falls back
--                      to image_url when this is NULL.
--
-- Convention
-- ----------
-- Brand DB changes are applied as raw, idempotent SQL (the project's Prisma
-- CLI is pinned to 6.19.3 while the global `npx prisma` is 7.8.0 and
-- incompatible, so `prisma db push` / `migrate` are NOT used). Every change is
-- recorded in docs/db/brand-db-manual-migrations.md and mirrored here.
--
-- Idempotency
-- -----------
-- All statements use `IF NOT EXISTS` and are safe to re-run.
-- No existing rows or columns are dropped/modified.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FORWARD
-- -----------------------------------------------------------------------------
ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS published_at     timestamp with time zone;

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS subtitle         character varying(255);

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS btn_text         character varying(120);

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS mobile_image_url text;

-- -----------------------------------------------------------------------------
-- ROLLBACK  (manual — only if the columns must be removed)
-- -----------------------------------------------------------------------------
-- ALTER TABLE banners DROP COLUMN IF EXISTS published_at;
-- ALTER TABLE banners DROP COLUMN IF EXISTS subtitle;
-- ALTER TABLE banners DROP COLUMN IF EXISTS btn_text;
-- ALTER TABLE banners DROP COLUMN IF EXISTS mobile_image_url;
--
-- NOTE: Dropping columns is irreversible and will discard any stored banner
--       content for those fields. Only run rollback after confirming no
--       production banners rely on them, or after exporting the data.
-- -----------------------------------------------------------------------------
