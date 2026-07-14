import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { validateErpSecretContract } from "./check-erp-secret-contract.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const retained = [
  "apps/erp/scripts/import-all-v3.js",
  "apps/erp/scripts/reset-and-import-sql.js",
];
const source = Object.fromEntries(retained.map((relative) => [relative, fs.readFileSync(path.join(root, relative), "utf8")]));
const report = fs.readFileSync(path.join(root, "docs/PHASE_S1_ERP_HISTORICAL_SECRETS_REMEDIATION_REVIEW_2026-07-14.md"), "utf8");

function errors(overrides = {}) {
  return validateErpSecretContract(root, { ...source, report, secretsPass: true, ...overrides });
}
function fails(overrides, rule) {
  assert.ok(errors(overrides).some((error) => error.includes(rule)));
}

test("current ERP secret contract passes", () => assert.deepEqual(errors(), []));
test("retained scripts use DIRECT_DATABASE_URL", () => {
  for (const relative of retained) assert.match(source[relative], /process\.env\.DIRECT_DATABASE_URL/);
});
test("missing environment variable fails closed before client initialization", () => {
  for (const relative of retained) {
    const script = source[relative];
    assert.ok(script.indexOf("process.exit(1)") < script.indexOf("new Client"));
  }
});
test("alternate database variables are rejected", () => fails({ [retained[0]]: source[retained[0]].replace("DIRECT_DATABASE_URL", "ERP_DATABASE_URL") }, "G-ERP-SEC-02"));
test("source fallback is rejected", () => fails({ [retained[0]]: source[retained[0]].replace("?.trim();", "?.trim() || getFallback();") }, "G-ERP-SEC-04"));
test("connection-string logging is rejected", () => fails({ [retained[1]]: `${source[retained[1]]}\nconsole.error(directDatabaseUrl);` }, "G-ERP-SEC-06"));
test("sensitive report fixture is rejected", () => fails({ report: ["credential marker ", "npg_", "examplevalue"].join("") }, "G-ERP-SEC-09"));
test("failed repository secrets gate is rejected", () => fails({ secretsPass: false }, "G-ERP-SEC-10"));
test("superseded tracked scripts are absent", () => assert.equal(fs.existsSync(path.join(root, "apps/erp/scripts/reset-and-import.js")), false));
test("diagnostic scripts are absent", () => assert.equal(fs.existsSync(path.join(root, "apps/erp/scripts/check-inventory-table.js")), false));
