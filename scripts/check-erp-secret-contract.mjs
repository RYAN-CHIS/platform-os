import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RETAINED = [
  "apps/erp/scripts/import-all-v3.js",
  "apps/erp/scripts/reset-and-import-sql.js",
];
const DELETED_TRACKED = [
  "apps/erp/scripts/reset-and-import-v2.js",
  "apps/erp/scripts/reset-and-import.js",
];
const DELETED_UNTRACKED = [
  "apps/erp/scripts/check-inventory-table.js",
  "apps/erp/scripts/check-table-structure.js",
  "apps/erp/scripts/import-purchase.js",
  "apps/erp/scripts/import-to-production.js",
];
const REPORT = "docs/PHASE_S1_ERP_HISTORICAL_SECRETS_REMEDIATION_REVIEW_2026-07-14.md";
const DATABASE_URL_LITERAL = /postgres(?:ql)?:\/\//i;
const FORBIDDEN_ENV = /process\.env\.(?!DIRECT_DATABASE_URL\b)[A-Z0-9_]*DATABASE_URL\b/;

function read(root, relative, errors) {
  try {
    return fs.readFileSync(path.join(root, relative), "utf8");
  } catch {
    errors.push(`G-ERP-SEC-00 ${relative}: required file is missing`);
    return "";
  }
}

function runSecretsGate(root) {
  try {
    execFileSync(process.execPath, ["scripts/check-no-hardcoded-secrets.mjs"], {
      cwd: root,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

function hasFailClosedCheck(source) {
  const envIndex = source.indexOf("const directDatabaseUrl = process.env.DIRECT_DATABASE_URL?.trim();");
  const guardIndex = source.indexOf("if (!directDatabaseUrl)");
  const exitIndex = source.indexOf("process.exit(1)");
  const clientIndex = source.indexOf("new Client");
  return envIndex >= 0 && guardIndex > envIndex && exitIndex > guardIndex && clientIndex > exitIndex;
}

function hasUnsafeLogging(source) {
  return /console\.(?:log|error)\([^\n]*(?:directDatabaseUrl|connectionString|error\.message|error\.stack)/.test(source);
}

export function validateErpSecretContract(root, overrides = {}) {
  const errors = [];
  const retainedSources = Object.fromEntries(
    RETAINED.map((relative) => [relative, overrides[relative] ?? read(root, relative, errors)])
  );
  const report = overrides.report ?? read(root, REPORT, errors);
  const scriptsDirectory = path.join(root, "apps/erp/scripts");
  const erpSources = overrides.erpSources ?? fs.readdirSync(scriptsDirectory)
    .filter((entry) => entry.endsWith(".js"))
    .map((entry) => [entry, fs.readFileSync(path.join(scriptsDirectory, entry), "utf8")]);

  if (erpSources.some(([, source]) => DATABASE_URL_LITERAL.test(source))) {
    errors.push("G-ERP-SEC-01 apps/erp/scripts: hardcoded database URL is prohibited");
  }

  for (const relative of RETAINED) {
    const source = retainedSources[relative];
    if (!source.includes("process.env.DIRECT_DATABASE_URL")) {
      errors.push(`G-ERP-SEC-02 ${relative}: DIRECT_DATABASE_URL is required`);
    }
    if (FORBIDDEN_ENV.test(source)) {
      errors.push(`G-ERP-SEC-03 ${relative}: alternate database environment variable is prohibited`);
    }
    if (/DIRECT_DATABASE_URL(?:\?\.trim\(\))?\s*(?:\|\||\?\?)/.test(source) || DATABASE_URL_LITERAL.test(source)) {
      errors.push(`G-ERP-SEC-04 ${relative}: database URL fallback is prohibited`);
    }
    if (!hasFailClosedCheck(source)) {
      errors.push(`G-ERP-SEC-05 ${relative}: missing DIRECT_DATABASE_URL must fail closed before client initialization`);
    }
    if (hasUnsafeLogging(source)) {
      errors.push(`G-ERP-SEC-06 ${relative}: connection details must not be logged`);
    }
  }

  for (const relative of DELETED_TRACKED) {
    if (fs.existsSync(path.join(root, relative))) errors.push(`G-ERP-SEC-07 ${relative}: superseded tracked script must be absent`);
  }
  for (const relative of DELETED_UNTRACKED) {
    if (fs.existsSync(path.join(root, relative))) errors.push(`G-ERP-SEC-08 ${relative}: diagnostic script must be absent`);
  }
  if (DATABASE_URL_LITERAL.test(report) || /npg_[A-Za-z0-9]{8,}/.test(report)) {
    errors.push(`G-ERP-SEC-09 ${REPORT}: sensitive historical credential material is prohibited`);
  }
  const secretsPass = overrides.secretsPass ?? runSecretsGate(root);
  if (!secretsPass) errors.push("G-ERP-SEC-10 repository: check:secrets must pass with zero findings");
  if (fs.existsSync(path.join(root, "apps/web"))) errors.push("G-ERP-SEC-11 apps/web: decommissioned legacy application must remain absent");
  if (Object.values(retainedSources).some((source) => /DIRECT_DATABASE_URL(?:\?\.trim\(\))?\s*(?:\|\||\?\?)/.test(source))) {
    errors.push("G-ERP-SEC-12 retained scripts: DIRECT_DATABASE_URL must not have a source fallback");
  }
  return errors;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const errors = validateErpSecretContract(root);
  if (errors.length) {
    console.error("ERP secret contract guard failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }
  console.log("ERP secret contract guard passed.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
