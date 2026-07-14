import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLISHER = "apps/platform/lib/publisher.ts";
const HOME_ACTIONS = "apps/platform/modules/brand/home/actions.ts";
const HOME_UI = "apps/platform/app/(platform)/brand/home/client.tsx";
const BRAND_OVERVIEW = "apps/platform/app/(platform)/brand/page.tsx";
const HOME_WRAPPERS = /submitHomeForReview|approveHome|rejectHome|scheduleHomePublish|publishHomeNow|unpublishHome|archiveHome|rollbackHome|getHomeVersions|getHomeStatus/;

function read(root, relative, errors) {
  try { return fs.readFileSync(path.join(root, relative), "utf8"); }
  catch { errors.push(`G-HOME-PUB-00 ${relative}: required file is missing`); return ""; }
}
function fail(errors, rule, file, message) { errors.push(`${rule} ${file}: ${message}`); }

export function validateHomePublisherContract(root, overrides = {}) {
  const errors = [];
  const publisher = overrides.publisher ?? read(root, PUBLISHER, errors);
  const actions = overrides.actions ?? read(root, HOME_ACTIONS, errors);
  const ui = overrides.ui ?? read(root, HOME_UI, errors);
  const overview = overrides.overview ?? read(root, BRAND_OVERVIEW, errors);
  if (!publisher || !actions || !ui || !overview) return errors;

  if (/\bhome\s*:|"home"|'home'|page_contents/.test(publisher)) fail(errors, "G-HOME-PUB-01", PUBLISHER, "Home must not be in the Publisher registry or implementation");
  if (/SELECT\s+status\s+FROM\s+page_contents/i.test(publisher)) fail(errors, "G-HOME-PUB-02", PUBLISHER, "Publisher must not read page_contents.status");
  if (/UPDATE\s+page_contents\s+SET\s+status/i.test(publisher)) fail(errors, "G-HOME-PUB-03", PUBLISHER, "Publisher must not write page_contents.status");
  if (/published_at|scheduled_at/i.test(publisher)) fail(errors, "G-HOME-PUB-04", PUBLISHER, "Publisher must not use PageContent published_at or scheduled_at");
  if (/published\s*(?:as|:)\s*PublishStatus|PublishStatus\([^)]*published/i.test(actions)) fail(errors, "G-HOME-PUB-05", HOME_ACTIONS, "PageContent.published must not be cast to PublishStatus");
  if (/\$queryRawUnsafe|\$executeRawUnsafe/.test(actions)) fail(errors, "G-HOME-PUB-11", HOME_ACTIONS, "Home actions must use typed Prisma only");
  if (HOME_WRAPPERS.test(actions)) fail(errors, "G-HOME-PUB-06", HOME_ACTIONS, "Home Publisher wrappers must be removed");
  if (!publisher.includes("Unsupported publisher content type")) fail(errors, "G-HOME-PUB-07", PUBLISHER, "unsupported content types must fail closed");
  if (!actions.includes("togglePageContentPublished") || !actions.includes("data: { published: !current.published }")) fail(errors, "G-HOME-PUB-08", HOME_ACTIONS, "typed PageContent Boolean toggle must remain");
  if (/\b(?:status|publishStatus|publish_status|publishedAt|scheduledAt|workflowState)\b/.test(actions)) fail(errors, "G-HOME-PUB-09", HOME_ACTIONS, "PageContent payload must not include workflow lifecycle fields");
  if (/rollback|review|approve|reject|schedule|archive|preview/i.test(ui)) fail(errors, "G-HOME-PUB-09", HOME_UI, "Home UI must not expose Publisher workflow controls");
  if (!ui.includes("togglePageContentPublished") || !ui.includes('row.published ? "取消发布" : "发布"')) fail(errors, "G-HOME-PUB-08", HOME_UI, "Boolean publish toggle UI must remain");
  if (/page_contents\s+WHERE\s+status|page_contents.*published_at/i.test(overview)) fail(errors, "G-HOME-PUB-04", BRAND_OVERVIEW, "overview must use typed PageContent Boolean counts");
  if (!overview.includes("brandDb.pageContent.count({ where: { published: true } })")) fail(errors, "G-HOME-PUB-08", BRAND_OVERVIEW, "overview must count published PageContent through the Boolean contract");
  for (const type of ["products", "series", "journal", "banners"]) {
    if (!publisher.includes(`${type}: {`)) fail(errors, "G-HOME-PUB-12", PUBLISHER, `${type} registry entry must remain`);
  }
  if (/\b(?:CREATE|ALTER|DROP)\s+TABLE\b/i.test(publisher) || /\b(?:CREATE|ALTER|DROP)\s+TABLE\b/i.test(actions)) fail(errors, "G-HOME-PUB-10", PUBLISHER, "Runtime DDL is prohibited");
  return errors;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const errors = validateHomePublisherContract(root);
  if (errors.length) { console.error("Home Publisher contract guard failed:"); errors.forEach((error) => console.error(`- ${error}`)); process.exitCode = 1; return; }
  console.log("Home Publisher contract guard passed.");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
