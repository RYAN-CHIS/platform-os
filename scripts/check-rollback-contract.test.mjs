import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { validateRollbackContract } from "./check-rollback-contract.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const publisherPath = "apps/platform/lib/publisher.ts";
const uiPaths = ["apps/platform/app/(platform)/brand/products/client.tsx", "apps/platform/app/(platform)/brand/series/client.tsx", "apps/platform/app/(platform)/brand/journal/client.tsx"];
const publisher = fs.readFileSync(path.join(root, publisherPath), "utf8");
const ui = Object.fromEntries(uiPaths.map((file) => [file, fs.readFileSync(path.join(root, file), "utf8")]));
function errors(overrides = {}) { return validateRollbackContract(root, { publisher, ...ui, ...overrides }); }
function fails(mutator, rule) { assert.ok(errors({ publisher: mutator(publisher) }).some((error) => error.includes(rule))); }

test("current rollback contract passes", () => assert.deepEqual(errors(), []));
test("Product PUBLISHED fixture has immediate effect metadata", () => assert.match(publisher, /PublishStatus\.PUBLISHED[\s\S]*immediatePublicEffect/));
test("Product DRAFT fixture preserves lifecycle", () => assert.match(publisher, /lifecycleForRollback[\s\S]*legacyBrandProduct\.update/));
test("Journal PUBLISHED fixture uses typed delegate", () => assert.match(publisher, /tx\.journalPost\.update/));
test("Series fixture uses typed delegate", () => assert.match(publisher, /tx\.legacyBrandSeries\.update/));
test("Banner PUBLISHED fixture uses typed delegate", () => assert.match(publisher, /tx\.banner\.update/));
test("snapshot status is not an update field", () => fails((s) => s.replace("data: productRestoreData(source.snapshot)", "data: { status: source.snapshot.status }"), "G-ROLLBACK-03"));
test("snapshot publishStatus is not an update field", () => fails((s) => s.replace("data: productRestoreData(source.snapshot)", "data: { publishStatus: source.snapshot.publishStatus }"), "G-ROLLBACK-04"));
test("snapshot publishedAt is not an update field", () => fails((s) => s.replace("data: productRestoreData(source.snapshot)", "data: { publishedAt: source.snapshot.publishedAt }"), "G-ROLLBACK-05"));
test("version for another content id cannot bypass exact query", () => fails((s) => s.replace("contentId: String(normalizedId), version: targetVersion", "version: targetVersion"), "G-ROLLBACK-02"));
test("version for another content type cannot bypass exact query", () => fails((s) => s.replace("contentType, contentId: String(normalizedId)", "contentId: String(normalizedId)"), "G-ROLLBACK-02"));
test("ARCHIVED fixture fails closed", () => assert.match(publisher, /Archived content cannot be rolled back/));
test("empty reason fixture is rejected", () => assert.match(publisher, /ROLLBACK_REASON_MIN_LENGTH/));
test("whitespace reason fixture is rejected", () => assert.match(publisher, /reason\.trim\(\)/));
test("unknown content type fixture fails closed", () => fails((s) => s.replace("ROLLBACK_CONTENT_TYPES.has(contentType)", "true"), "G-ROLLBACK-18"));
test("null snapshot fixture fails closed", () => assert.match(publisher, /!isRecord\(source\.snapshot\)/));
test("array snapshot fixture fails closed", () => assert.match(publisher, /!Array\.isArray/));
test("snapshot without restore fields fails closed", () => assert.match(publisher, /has no Product restore fields/));
test("pending jobs are cancelled", () => assert.match(publisher, /status: "pending"[\s\S]*status: "cancelled"/));
test("completed jobs are preserved", () => assert.doesNotMatch(publisher, /publishJob\.deleteMany/));
test("AuditLog is created", () => assert.match(publisher, /tx\.auditLog\.create/));
test("RESTORED version is created", () => assert.match(publisher, /status: "RESTORED"/));
test("historical versions are immutable", () => assert.doesNotMatch(publisher, /contentVersion\.(?:update|delete)/));
test("Home remains excluded from emergency rollback", () => assert.doesNotMatch(publisher, /"home"|case "home"/));
test("UI warning and reason are present", () => uiPaths.forEach((file) => assert.match(ui[file], /此操作会立即使用所选历史版本替换当前线上内容/)));
test("UI prevents duplicate submit", () => uiPaths.forEach((file) => assert.match(ui[file], /trim\(\)\.length < 5|reasonValid/)));
