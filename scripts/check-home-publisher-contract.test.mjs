import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { validateHomePublisherContract } from "./check-home-publisher-contract.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const files = {
  publisher: "apps/platform/lib/publisher.ts",
  actions: "apps/platform/modules/brand/home/actions.ts",
  ui: "apps/platform/app/(platform)/brand/home/client.tsx",
  overview: "apps/platform/app/(platform)/brand/page.tsx",
};
const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(path.join(root, file), "utf8")]));
function errors(overrides = {}) { return validateHomePublisherContract(root, { ...source, ...overrides }); }
function fails(overrides, rule) { assert.ok(errors(overrides).some((error) => error.includes(rule))); }

test("current Home Publisher contract passes", () => assert.deepEqual(errors(), []));
test("HOME lookup is rejected by an absent registry entry", () => assert.doesNotMatch(source.publisher, /\bhome\s*:/));
test("HOME runtime input fails closed", () => assert.match(source.publisher, /Unsupported publisher content type/));
test("PRODUCT registry remains accepted", () => assert.match(source.publisher, /products: \{/));
test("SERIES registry remains accepted", () => assert.match(source.publisher, /series: \{/));
test("JOURNAL registry remains accepted", () => assert.match(source.publisher, /journal: \{/));
test("BANNER registry remains accepted", () => assert.match(source.publisher, /banners: \{/));
test("page_contents status fixture fails", () => fails({ publisher: source.publisher.replace("const PREVIEW_SECRET", 'const legacy = "SELECT status FROM page_contents";\nconst PREVIEW_SECRET') }, "G-HOME-PUB-01"));
test("page_contents published_at fixture fails", () => fails({ publisher: source.publisher.replace("const PREVIEW_SECRET", 'const legacy = "published_at";\nconst PREVIEW_SECRET') }, "G-HOME-PUB-04"));
test("Home wrapper export fixture fails", () => fails({ actions: `${source.actions}\nexport async function rollbackHome() {}` }, "G-HOME-PUB-06"));
test("typed Boolean toggle remains", () => assert.match(source.actions, /togglePageContentPublished[\s\S]*published: !current\.published/));
test("Home UI payload contains no workflow controls", () => assert.doesNotMatch(source.ui, /rollback|review|approve|reject|schedule|archive|preview/i));
test("Runtime DDL fixture fails", () => fails({ actions: `${source.actions}\nconst ddl = "CREATE TABLE page_contents";` }, "G-HOME-PUB-10"));
