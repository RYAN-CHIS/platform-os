import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { validatePrismaSchemaContract } from "./check-prisma-schema-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const brandSchema = fs.readFileSync(path.join(repositoryRoot, "packages/brand-db/schema.prisma"), "utf8");
const fixtureRoots = [];

function writeFixture(relativePath, content, root) {
  const destination = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
}

function createFixture(mutator = (schema) => schema) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "yunwu-prisma-contract-"));
  fixtureRoots.push(root);
  writeFixture("packages/db/schema.prisma", 'datasource db { provider = "postgresql" url = env("DATABASE_URL") }', root);
  const frozenBase = (output = "") => `// FROZEN: packages/db/schema.prisma; do not migrate or db push; Phase 3 delete\ngenerator client { provider = "prisma-client-js"${output} }\ndatasource db { provider = "postgresql" url = env("DATABASE_URL") }`;
  writeFixture("apps/brand-os/prisma/schema.prisma", frozenBase(' output = "../node_modules/@prisma/brand-client"'), root);
  writeFixture("apps/web/prisma/schema.prisma", frozenBase(' output = "../node_modules/@prisma/web-client"'), root);
  writeFixture("apps/erp/prisma/schema.prisma", frozenBase(), root);
  writeFixture("packages/brand-db/schema.prisma", mutator(brandSchema), root);
  return root;
}

function errorsFor(mutator) {
  return validatePrismaSchemaContract(createFixture(mutator));
}

function assertFailure(mutator, expected) {
  const errors = errorsFor(mutator);
  assert.ok(errors.some((error) => error.includes(expected)), `expected ${expected}; received:\n${errors.join("\n")}`);
}

afterEach(() => {
  while (fixtureRoots.length) fs.rmSync(fixtureRoots.pop(), { recursive: true, force: true });
});

describe("Prisma schema contract", () => {
  it("accepts the repository ERP and Brand Runtime schemas", () => {
    assert.deepEqual(validatePrismaSchemaContract(repositoryRoot), []);
  });

  it("accepts the exact Brand PublishStatus enum, dual status fields, and brand_materials link", () => {
    assert.deepEqual(validatePrismaSchemaContract(createFixture()), []);
  });

  it("rejects DATABASE_URL for the Brand datasource", () => {
    assertFailure((schema) => schema.replace('env("BRAND_DATABASE_URL")', 'env("DATABASE_URL")'), "Brand datasource contract failed");
  });

  it("rejects a hardcoded Brand PostgreSQL URL", () => {
    assertFailure((schema) => schema.replace('env("BRAND_DATABASE_URL")', '"postgresql://user:password@localhost:5432/brand"'), "hardcoded PostgreSQL URL");
  });

  it("rejects a missing PublishStatus value", () => {
    assertFailure((schema) => schema.replace(/\n  UNPUBLISHED/, ""), "PublishStatus enum contract failed");
  });

  it("rejects an extra workflow-only PublishStatus value", () => {
    assertFailure((schema) => schema.replace("  PENDING_REVIEW", "  PENDING_REVIEW\n  IN_REVIEW"), "PublishStatus enum contract failed");
  });

  it("rejects a reordered PublishStatus enum", () => {
    assertFailure((schema) => schema.replace("  DRAFT\n  PENDING_REVIEW", "  PENDING_REVIEW\n  DRAFT"), "PublishStatus enum contract failed");
  });

  it("rejects Product.status as PublishStatus", () => {
    assertFailure((schema) => schema.replace(/(model LegacyBrandProduct\s*\{[\s\S]*?\n\s*status\s+)String\b/, "$1PublishStatus"), "LegacyBrandProduct.status contract failed");
  });

  it("rejects Product.publishStatus as String", () => {
    assertFailure((schema) => schema.replace(/(model LegacyBrandProduct\s*\{[\s\S]*?\n\s*publishStatus\s+)PublishStatus\b/, "$1String"), "LegacyBrandProduct.publishStatus contract failed");
  });

  it("rejects Series.status as PublishStatus", () => {
    assertFailure((schema) => schema.replace(/(model LegacyBrandSeries\s*\{[\s\S]*?\n\s*status\s+)String\?/, "$1PublishStatus"), "LegacyBrandSeries.status contract failed");
  });

  it("rejects JournalPost.status as String", () => {
    assertFailure((schema) => schema.replace(/(model JournalPost\s*\{[\s\S]*?\n\s*status\s+)PublishStatus\b/, "$1String"), "JournalPost.status contract failed");
  });

  it("rejects Banner, PublishJob, and ContentVersion status fields as PublishStatus", () => {
    for (const model of ["Banner", "PublishJob", "ContentVersion"]) {
      assertFailure((schema) => schema.replace(new RegExp(`(model ${model}\\s*\\{[\\s\\S]*?\\n\\s*status\\s+)String\\?`), "$1PublishStatus"), `${model}.status contract failed`);
    }
  });

  it("rejects a future target-table mapping", () => {
    assertFailure((schema) => `${schema}\nmodel FutureTarget {\n  id Int @id\n  @@map("brand_products")\n}\n`, "future-target mapping failed");
  });

  it("rejects brand_materials when modeled as a future BrandMaterial entity", () => {
    assertFailure((schema) => schema.replace("model LegacyBrandMaterialLink", "model BrandMaterial"), "brand_materials semantic contract failed");
  });

  it("rejects a missing required physical table mapping", () => {
    assertFailure((schema) => schema.replace('@@map("audit_logs")', '@@map("audit_log_records")'), "expected @@map(\"audit_logs\")");
  });
});
