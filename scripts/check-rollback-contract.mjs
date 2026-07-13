import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLISHER = "apps/platform/lib/publisher.ts";
const HOME_ACTIONS = "apps/platform/modules/brand/home/actions.ts";
const UI_FILES = [
  "apps/platform/app/(platform)/brand/products/client.tsx",
  "apps/platform/app/(platform)/brand/series/client.tsx",
  "apps/platform/app/(platform)/brand/journal/client.tsx",
];

function read(root, relative, errors) {
  try { return fs.readFileSync(path.join(root, relative), "utf8"); }
  catch { errors.push(`G-ROLLBACK-00 ${relative}: required file is missing`); return ""; }
}
function block(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) return "";
  const parameters = source.indexOf("(", start);
  let parens = 0;
  let signatureEnd = parameters;
  for (let index = parameters; index < source.length; index += 1) {
    if (source[index] === "(") parens += 1;
    if (source[index] === ")") parens -= 1;
    if (parens === 0) { signatureEnd = index; break; }
  }
  const lineEnd = source.indexOf("\n", signatureEnd);
  const open = source.lastIndexOf("{", lineEnd < 0 ? source.length : lineEnd);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  return source.slice(start);
}
function requireToken(errors, source, token, rule, file = PUBLISHER) {
  if (!source.includes(token)) errors.push(`${rule} ${file}: missing ${token}`);
}

export function validateRollbackContract(root, overrides = {}) {
  const errors = [];
  const publisher = overrides.publisher ?? read(root, PUBLISHER, errors);
  const home = overrides.home ?? read(root, HOME_ACTIONS, errors);
  const ui = UI_FILES.map((file) => [file, overrides[file] ?? read(root, file, errors)]);
  const rollback = block(publisher, "export async function rollbackToVersion");
  const finish = block(publisher, "async function finishRollback");
  if (!rollback || !finish) { errors.push(`G-ROLLBACK-00 ${PUBLISHER}: rollback functions are missing`); return errors; }

  requireToken(errors, publisher, "PRODUCT_RESTORE_FIELDS", "G-ROLLBACK-01");
  requireToken(errors, publisher, "SERIES_RESTORE_FIELDS", "G-ROLLBACK-01");
  requireToken(errors, publisher, "JOURNAL_RESTORE_FIELDS", "G-ROLLBACK-01");
  requireToken(errors, publisher, "BANNER_RESTORE_FIELDS", "G-ROLLBACK-01");
  if (/Object\.entries\(snapshot\)|Object\.keys\(snapshot\)|\$executeRawUnsafe/.test(rollback)) errors.push(`G-ROLLBACK-01 ${PUBLISHER}: rollback must not use exclusion-only snapshot keys or dynamic SQL`);
  requireToken(errors, rollback, "where: { contentType, contentId: String(normalizedId), version: targetVersion }", "G-ROLLBACK-02");
  for (const [field, rule] of [["status", "G-ROLLBACK-03"], ["publishStatus", "G-ROLLBACK-04"], ["publishedAt", "G-ROLLBACK-05"], ["scheduledAt", "G-ROLLBACK-05"]]) {
    if (new RegExp(`data:\\s*\\{[^}]*${field}`).test(rollback)) errors.push(`${rule} ${PUBLISHER}: lifecycle field ${field} must not be in a rollback update`);
  }
  requireToken(errors, rollback, "lifecycleForRollback", "G-ROLLBACK-06");
  requireToken(errors, publisher, "PublishStatus.ARCHIVED", "G-ROLLBACK-11");
  requireToken(errors, rollback, "requireEmergencyRollbackPermission", "G-ROLLBACK-13");
  requireToken(errors, rollback, "validateRollbackReason", "G-ROLLBACK-12");
  requireToken(errors, finish, 'status: "cancelled"', "G-ROLLBACK-14");
  requireToken(errors, finish, 'action: "ROLLBACK"', "G-ROLLBACK-15");
  requireToken(errors, finish, 'status: "RESTORED"', "G-ROLLBACK-16");
  if (/\.contentVersion\.(?:update|delete|updateMany|deleteMany)\(/.test(rollback)) errors.push(`G-ROLLBACK-17 ${PUBLISHER}: historical versions must remain immutable`);
  requireToken(errors, rollback, "ROLLBACK_CONTENT_TYPES.has(contentType)", "G-ROLLBACK-18");
  requireToken(errors, rollback, "isRecord(source.snapshot)", "G-ROLLBACK-19");
  if (/\$executeRawUnsafe|\$queryRawUnsafe|Prisma\.raw/.test(rollback)) errors.push(`G-ROLLBACK-20 ${PUBLISHER}: rollback must not construct SQL from snapshot keys`);
  requireToken(errors, finish, "immediatePublicEffect", "G-ROLLBACK-10");
  if (/\b(?:CREATE|ALTER|DROP)\s+TABLE\b/i.test(publisher)) errors.push(`G-ROLLBACK-24 ${PUBLISHER}: Runtime DDL is prohibited`);
  if (/\bas\s+any\b|\bas\s+unknown\s+as\b/.test(rollback)) errors.push(`G-ROLLBACK-20 ${PUBLISHER}: unsafe rollback assertion is prohibited`);
  requireToken(errors, home, 'rollbackToVersion("home", id, version)', "G-ROLLBACK-23", HOME_ACTIONS);
  for (const [file, source] of ui) {
    requireToken(errors, source, "此操作会立即使用所选历史版本替换当前线上内容。无需重新审核，操作不可静默撤销。", "G-ROLLBACK-21", file);
    requireToken(errors, source, "rollbackReason", "G-ROLLBACK-22", file);
    if (!source.includes("trim().length < 5") && !source.includes("reasonValid")) errors.push(`G-ROLLBACK-25 ${file}: duplicate-submit prevention is missing`);
  }
  return errors;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const errors = validateRollbackContract(root);
  if (errors.length) { console.error("Rollback contract guard failed:"); errors.forEach((error) => console.error(`- ${error}`)); process.exitCode = 1; return; }
  console.log("Rollback contract guard passed.");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
