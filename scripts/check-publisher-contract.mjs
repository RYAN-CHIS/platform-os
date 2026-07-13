import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLISHER = "apps/platform/lib/publisher.ts";
const SCHEMA = "packages/brand-db/schema.prisma";
const PRODUCT_GUARD = "scripts/check-product-status-ownership.mjs";
const JOURNAL_GUARD = "scripts/check-journal-contract.mjs";
const WRAPPERS = [
  "apps/platform/modules/brand/products/actions.ts",
  "apps/platform/modules/brand/series/actions.ts",
  "apps/platform/modules/brand/journal/actions.ts",
  "apps/platform/modules/brand/banners/actions.ts",
];
const CANONICAL = ["DRAFT", "PENDING_REVIEW", "APPROVED", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"];

function read(root, relative, errors) {
  try { return fs.readFileSync(path.join(root, relative), "utf8"); }
  catch { errors.push(`G-PUB-00 ${relative}: required source file is missing`); return ""; }
}
function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) return "";
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  return source.slice(start);
}
function requireToken(errors, source, token, rule, message) {
  if (!source.includes(token)) errors.push(`${rule} ${PUBLISHER}: ${message}`);
}

export function validatePublisherContract(root, overrides = {}) {
  const errors = [];
  const publisher = overrides.publisher ?? read(root, PUBLISHER, errors);
  const schema = overrides.schema ?? read(root, SCHEMA, errors);
  if (!publisher || !schema) return errors;

  const enumBlock = /enum PublishStatus\s*\{([\s\S]*?)\}/.exec(schema)?.[1] ?? "";
  const values = [...enumBlock.matchAll(/^\s*([A-Z_]+)\s*$/gm)].map((match) => match[1]);
  if (values.length !== CANONICAL.length || CANONICAL.some((value) => !values.includes(value))) errors.push("G-PUB-01 packages/brand-db/schema.prisma: PublishStatus must contain exactly the six Canonical values");
  for (const [value, rule] of [["IN_REVIEW", "G-PUB-02"], ["SCHEDULED", "G-PUB-03"], ["REJECTED", "G-PUB-04"]]) {
    if (new RegExp(`CAST\\([^\\n]*${value}|${value}\\s+as\\s+PublishStatus|PublishStatus\\.${value}`).test(publisher)) errors.push(`${rule} ${PUBLISHER}: workflow-only ${value} must not be persisted as PublishStatus`);
  }
  requireToken(errors, publisher, 'case "SUBMIT_FOR_REVIEW": targetStatus = PublishStatus.PENDING_REVIEW', "G-PUB-05", "submit must resolve to PENDING_REVIEW");
  requireToken(errors, publisher, 'case "SCHEDULE":', "G-PUB-06", "schedule resolver is missing");
  requireToken(errors, publisher, 'publishJobOperation = "upsert"', "G-PUB-06", "schedule must create or reschedule a publish job");
  requireToken(errors, publisher, 'case "REJECT":', "G-PUB-07", "reject resolver is missing");
  requireToken(errors, publisher, "rejectionMetadata", "G-PUB-07", "reject metadata contract is missing");
  requireToken(errors, publisher, 'persistenceKind: "product-dual"', "G-PUB-08", "Product dual-status registry contract is missing");
  requireToken(errors, publisher, 'persistenceKind: "publish-status"', "G-PUB-09", "Journal enum-status registry contract is missing");
  requireToken(errors, publisher, "PUBLISHER_CONTENT_REGISTRY", "G-PUB-10", "closed content registry is missing");
  requireToken(errors, publisher, 'if (!(job.contentType in PUBLISHER_CONTENT_REGISTRY))', "G-PUB-10", "scheduled jobs must reject unknown contentType values");
  requireToken(errors, publisher, "idKind", "G-PUB-11", "registry-controlled ID kind is missing");
  requireToken(errors, publisher, "brandDb.$transaction(async (tx)", "G-PUB-06", "content update and publish job must share a Brand transaction");
  requireToken(errors, publisher, 'completed.transition.command === "PUBLISH"', "G-PUB-06", "publish must retain the version snapshot side effect");
  requireToken(errors, publisher, "await createVersion(contentType, normalizedId, snapshot, PublishStatus.PUBLISHED)", "G-PUB-06", "publish snapshot must use Canonical PUBLISHED");
  if (/\b(?:CREATE|ALTER|DROP)\s+TABLE\b/i.test(publisher)) errors.push(`G-PUB-14 ${PUBLISHER}: Runtime DDL is prohibited`);
  if (/\bas\s+PublishStatus\b|\bas\s+any\b|\bas\s+unknown\s+as\b/.test(publisher)) errors.push(`G-PUB-15 ${PUBLISHER}: unsafe Publisher type assertion is prohibited`);

  for (const wrapperPath of WRAPPERS) {
    const source = overrides[wrapperPath] ?? read(root, wrapperPath, errors);
    if (/transitionStatus\([^\n]+\bas\s+any\b/.test(source)) errors.push(`G-PUB-12 ${wrapperPath}: wrapper must not cast a status command`);
  }
  const wrapperBlocks = [
    ["apps/platform/modules/brand/products/actions.ts", "toggleProductStatus"],
    ["apps/platform/modules/brand/series/actions.ts", "toggleSeriesActive"],
    ["apps/platform/modules/brand/journal/actions.ts", "togglePostStatus"],
    ["apps/platform/modules/brand/banners/actions.ts", "publishBanner"],
    ["apps/platform/modules/brand/banners/actions.ts", "unpublishBanner"],
  ];
  for (const [wrapperPath, name] of wrapperBlocks) {
    const source = overrides[wrapperPath] ?? read(root, wrapperPath, errors);
    const block = functionBlock(source, name);
    if (!block || /\b(?:brandDb|brandPrisma)\.[\w$]+\.(?:update|updateMany|upsert|create|delete)\(/.test(block) || /\$(?:execute|query)RawUnsafe/.test(block)) errors.push(`G-PUB-12 ${wrapperPath}: ${name} must not directly write Publisher state`);
  }
  const productGuard = overrides.productGuard ?? read(root, PRODUCT_GUARD, errors);
  const journalGuard = overrides.journalGuard ?? read(root, JOURNAL_GUARD, errors);
  if (!productGuard.includes("validateProductStatusOwnership") || !journalGuard.includes("validateJournalContract")) errors.push("G-PUB-13 scripts: ordinary CRUD guard entrypoints must remain present");
  return errors;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const errors = validatePublisherContract(root);
  if (errors.length) { console.error("Publisher contract guard failed:"); errors.forEach((error) => console.error(`- ${error}`)); process.exitCode = 1; return; }
  console.log("Publisher contract guard passed.");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
