import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { validateProductStatusOwnership } from "./check-product-status-ownership.mjs";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const actionsPath = "apps/platform/modules/brand/products/actions.ts";
const clientPath = "apps/platform/app/(platform)/brand/products/client.tsx";
const actions = fs.readFileSync(path.join(repositoryRoot, actionsPath), "utf8");
const client = fs.readFileSync(path.join(repositoryRoot, clientPath), "utf8");
const fixtureRoots = [];

function writeFixture(root, relativePath, source) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source);
}

function createFixture({ actionSource = actions, clientSource = client } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "yunwu-product-status-"));
  fixtureRoots.push(root);
  writeFixture(root, actionsPath, actionSource);
  writeFixture(root, clientPath, clientSource);
  return root;
}

function expectRule(root, rule) {
  const errors = validateProductStatusOwnership(root);
  assert.ok(errors.some((error) => error.startsWith(rule)), `expected ${rule}; received:\n${errors.join("\n")}`);
}

afterEach(() => {
  while (fixtureRoots.length) fs.rmSync(fixtureRoots.pop(), { recursive: true, force: true });
});

describe("Product status ownership guard", () => {
  it("accepts the repository source", () => {
    assert.deepEqual(validateProductStatusOwnership(repositoryRoot), []);
  });

  it("rejects status in the ordinary update whitelist", () => {
    expectRule(createFixture({ actionSource: actions.replace('"materials", "inspiration"', '"status", "materials", "inspiration"') }), "G-PROD-01");
  });

  it("rejects publish_status in the ordinary update whitelist", () => {
    expectRule(createFixture({ actionSource: actions.replace('"materials", "inspiration"', '"publish_status", "materials", "inspiration"') }), "G-PROD-02");
  });

  it("rejects ERP refresh writes to status", () => {
    expectRule(createFixture({ actionSource: actions.replace('stock: Number(erpSku.finished_stock ?? 0),', 'stock: Number(erpSku.finished_stock ?? 0),\n    status: "PUBLISHED",') }), "G-PROD-03");
  });

  it("rejects ordinary Product form status payloads", () => {
    expectRule(createFixture({ clientSource: client.replace('story: initialData?.story ?? "",', 'status: initialData?.status ?? "DRAFT", story: initialData?.story ?? "",') }), "G-PROD-04");
  });

  it("allows Publisher wrapper status ownership", () => {
    const publisherOnly = actions.replace('const result = await transitionStatus("products", productId, newStatus as any);', 'const result = await transitionStatus("products", productId, newStatus as any);\n  const status = newStatus;');
    assert.deepEqual(validateProductStatusOwnership(createFixture({ actionSource: publisherOnly })), []);
  });
});
