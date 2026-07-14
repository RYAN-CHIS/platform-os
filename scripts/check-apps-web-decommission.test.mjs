import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { validateAppsWebDecommission } from "./check-apps-web-decommission.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const source = {
  packageJson: fs.readFileSync(path.join(root, "package.json"), "utf8"),
  vercel: fs.readFileSync(path.join(root, "vercel.json"), "utf8"),
  workspace: fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8"),
  lockfile: fs.readFileSync(path.join(root, "pnpm-lock.yaml"), "utf8"),
  baseline: fs.readFileSync(path.join(root, "docs/YUNWU_MASTER_BASELINE.md"), "utf8"),
};
function errors(overrides = {}) { return validateAppsWebDecommission(root, { ...source, ...overrides }); }
function fails(overrides, rule) { assert.ok(errors(overrides).some((error) => error.includes(rule))); }

test("current decommission contract passes", () => assert.deepEqual(errors(), []));
test("apps/web is absent", () => assert.equal(fs.existsSync(path.join(root, "apps/web")), false));
test("git has no tracked apps/web files", () => assert.equal(errors().some((error) => error.includes("G-WEB-DECOM-02")), false));
test("@yunwu/web is absent from package scripts", () => assert.doesNotMatch(source.packageJson, /@yunwu\/web|dev:web|build:web/));
test("Vercel config has no legacy Web target", () => assert.doesNotMatch(source.vercel, /@yunwu\/web|apps\/web/));
test("lockfile has no apps/web importer", () => assert.doesNotMatch(source.lockfile, /^\s{2}apps\/web:/m));
test("apps/platform remains present", () => assert.equal(fs.existsSync(path.join(root, "apps/platform")), true));
test("apps/erp remains present", () => assert.equal(fs.existsSync(path.join(root, "apps/erp")), true));
test("apps/brand-os remains present", () => assert.equal(fs.existsSync(path.join(root, "apps/brand-os")), true));
test("historical documentation references are not scanned as runtime config", () => assert.match(fs.readFileSync(path.join(root, "docs/PHASE_F1R_APPS_WEB_TRACKED_DECOMMISSION_RECONCILIATION_2026-07-14.md"), "utf8"), /apps\/web/));
test("runtime config reference is rejected", () => fails({ packageJson: `${source.packageJson}\n"dev:web": "pnpm --filter @yunwu/web dev"` }, "G-WEB-DECOM-03"));
test("production Storefront baseline remains present", () => assert.match(source.baseline, /\/Users\/ryan\/Projects\/active\/yunwu-origin/));
test("pre-decommission tag target is retained", () => assert.equal(errors().some((error) => error.includes("G-WEB-DECOM-13")), false));
test("tracked secrets file remains absent", () => assert.equal(fs.existsSync(path.join(root, "apps/web/scripts/DEPLOY_SETUP.md")), false));
