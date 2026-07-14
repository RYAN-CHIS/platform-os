import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TAG = "pre-apps-web-decommission-2026-07-14";
const TAG_TARGET = "9ed344f33211c5dec0978b992e2bc1424f61fd09";
const ROOT_FILES = ["package.json", "vercel.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"];
const BASELINE = "docs/YUNWU_MASTER_BASELINE.md";

function read(root, relative, errors) {
  try { return fs.readFileSync(path.join(root, relative), "utf8"); }
  catch { errors.push(`G-WEB-DECOM-00 ${relative}: required file is missing`); return ""; }
}
function git(root, args) {
  try { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
  catch { return ""; }
}

export function validateAppsWebDecommission(root, overrides = {}) {
  const errors = [];
  const packageJson = overrides.packageJson ?? read(root, "package.json", errors);
  const vercel = overrides.vercel ?? read(root, "vercel.json", errors);
  const workspace = overrides.workspace ?? read(root, "pnpm-workspace.yaml", errors);
  const lockfile = overrides.lockfile ?? read(root, "pnpm-lock.yaml", errors);
  const baseline = overrides.baseline ?? read(root, BASELINE, errors);
  const tracked = overrides.tracked ?? git(root, ["ls-files", "apps/web"]);
  const tagTarget = overrides.tagTarget ?? git(root, ["rev-list", "-n", "1", TAG]);
  if (fs.existsSync(path.join(root, "apps/web"))) errors.push("G-WEB-DECOM-01 apps/web: legacy application directory must not exist");
  if (tracked.trim()) errors.push("G-WEB-DECOM-02 git: apps/web must have no tracked files");
  if (/@yunwu\/web|dev:web|build:web|apps\/web/.test(packageJson)) errors.push("G-WEB-DECOM-03 package.json: legacy Web package and scripts must be absent");
  if (/@yunwu\/web|apps\/web/.test(workspace)) errors.push("G-WEB-DECOM-03 pnpm-workspace.yaml: legacy Web workspace entry must be absent");
  if (/^\s{2}apps\/web:|@yunwu\/web/m.test(lockfile)) errors.push("G-WEB-DECOM-04 pnpm-lock.yaml: legacy Web importer/package must be absent");
  if (/@yunwu\/web|apps\/web/.test(vercel)) errors.push("G-WEB-DECOM-05 vercel.json: legacy Web target must be absent");
  if (!vercel.includes("@yunwu/platform-app") || !vercel.includes("apps/platform/.next")) errors.push("G-WEB-DECOM-05 vercel.json: canonical Platform target is required");
  for (const relative of ROOT_FILES) {
    const source = relative === "package.json" ? packageJson : relative === "vercel.json" ? vercel : relative === "pnpm-workspace.yaml" ? workspace : lockfile;
    if (/cd apps\/web|--filter[ =]+@yunwu\/web/.test(source)) errors.push(`G-WEB-DECOM-07 ${relative}: runtime reference to legacy Web is prohibited`);
  }
  if (!baseline.includes("/Users/ryan/Projects/active/yunwu-origin")) errors.push("G-WEB-DECOM-08 docs/YUNWU_MASTER_BASELINE.md: production Storefront must remain yunwu-origin");
  if (!baseline.includes("eight ERP historical findings")) errors.push("G-WEB-DECOM-12 docs/YUNWU_MASTER_BASELINE.md: remaining ERP secrets debt must be recorded");
  if (fs.existsSync(path.join(root, "apps/web/scripts/DEPLOY_SETUP.md"))) errors.push("G-WEB-DECOM-11 apps/web/scripts/DEPLOY_SETUP.md: tracked secrets-bearing legacy file must be absent");
  if (tagTarget !== TAG_TARGET) errors.push(`G-WEB-DECOM-13 git: ${TAG} must point to ${TAG_TARGET}`);
  return errors;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const errors = validateAppsWebDecommission(root);
  if (errors.length) { console.error("apps/web decommission guard failed:"); errors.forEach((error) => console.error(`- ${error}`)); process.exitCode = 1; return; }
  console.log("apps/web decommission guard passed.");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
