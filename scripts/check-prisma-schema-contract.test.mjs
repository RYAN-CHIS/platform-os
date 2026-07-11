import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validatePrismaSchemaContract } from "./check-prisma-schema-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPaths = [
  "packages/db/schema.prisma",
  "apps/brand-os/prisma/schema.prisma",
  "apps/web/prisma/schema.prisma",
  "apps/erp/prisma/schema.prisma",
];

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-contract-"));
  for (const relativePath of schemaPaths) {
    const target = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, relativePath), target);
  }
  return root;
}

function replace(root, relativePath, from, to) {
  const target = path.join(root, relativePath);
  const content = fs.readFileSync(target, "utf8");
  assert.ok(content.includes(from), `${relativePath} fixture must contain expected source text`);
  fs.writeFileSync(target, content.replace(from, to));
}

test("current repository schema contract passes", () => {
  assert.deepEqual(validatePrismaSchemaContract(repositoryRoot), []);
});

test("remaining_quantity mapping is rejected", () => {
  const root = fixtureRoot();
  replace(root, "apps/web/prisma/schema.prisma", '@map("remaining_qty")', '@map("remaining_quantity")');
  assert.match(validatePrismaSchemaContract(root).join("\n"), /apps\/web\/prisma\/schema\.prisma: remaining_quantity is forbidden/);
});

test("missing frozen ownership marker is rejected", () => {
  const root = fixtureRoot();
  replace(root, "apps/brand-os/prisma/schema.prisma", "FROZEN", "ARCHIVED");
  assert.match(validatePrismaSchemaContract(root).join("\n"), /apps\/brand-os\/prisma\/schema\.prisma: missing FROZEN ownership marker/);
});

test("incorrect datasource contract is rejected", () => {
  const root = fixtureRoot();
  replace(root, "apps/erp/prisma/schema.prisma", 'provider = "postgresql"', 'provider = "mysql"');
  assert.match(validatePrismaSchemaContract(root).join("\n"), /apps\/erp\/prisma\/schema\.prisma: datasource must use provider postgresql/);
});

test("incorrect field mapping identifies the file and field", () => {
  const root = fixtureRoot();
  replace(root, "apps/web/prisma/schema.prisma", '@map("series_id")', '@map("wrong_series")');
  assert.match(validatePrismaSchemaContract(root).join("\n"), /apps\/web\/prisma\/schema\.prisma: seriesId must map to series_id/);
});
