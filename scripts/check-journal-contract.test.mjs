import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { resolveJournalCategoryContract, validateJournalContract } from "./check-journal-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const actionsPath = "apps/platform/modules/brand/journal/actions.ts";
const clientPath = "apps/platform/app/(platform)/brand/journal/client.tsx";
const actions = fs.readFileSync(path.join(repositoryRoot, actionsPath), "utf8");
const client = fs.readFileSync(path.join(repositoryRoot, clientPath), "utf8");
const fixtureRoots = [];

function fixture({ actionSource = actions, clientSource = client } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "yunwu-journal-contract-"));
  fixtureRoots.push(root);
  for (const [relativePath, source] of [[actionsPath, actionSource], [clientPath, clientSource]]) {
    const target = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  }
  return root;
}

function expectRule(root, rule) {
  const errors = validateJournalContract(root);
  assert.ok(errors.some((error) => error.startsWith(rule)), `expected ${rule}; received:\n${errors.join("\n")}`);
}

afterEach(() => {
  while (fixtureRoots.length) fs.rmSync(fixtureRoots.pop(), { recursive: true, force: true });
});

describe("Journal contract guard", () => {
  it("accepts the repository source", () => assert.deepEqual(validateJournalContract(repositoryRoot), []));
  it("accepts canonical categories and approved legacy mappings", () => {
    assert.equal(resolveJournalCategoryContract("OBJECT"), "OBJECT");
    assert.equal(resolveJournalCategoryContract("MATERIAL"), "MATERIAL");
    assert.equal(resolveJournalCategoryContract("ARTIFACT"), "OBJECT");
    assert.equal(resolveJournalCategoryContract("BRAND"), "PHILOSOPHY");
    assert.equal(resolveJournalCategoryContract("CRAFT"), "CRAFT");
  });
  it("rejects ambiguous and unknown categories", () => {
    for (const category of ["TRAVELER", "OTHER", "random", "", 1, []]) assert.throws(() => resolveJournalCategoryContract(category));
  });
  it("rejects workflow status in ordinary update", () => expectRule(fixture({ actionSource: actions.replace('const JOURNAL_UPDATE_FIELDS = JOURNAL_CREATE_FIELDS;', 'const JOURNAL_UPDATE_FIELDS = ["status"] as const;') }), "G-JOURNAL-01"));
  it("rejects a create path without fixed DRAFT", () => expectRule(fixture({ actionSource: actions.replace("status: PublishStatus.DRAFT", "status: PublishStatus.PUBLISHED") }), "G-JOURNAL-02"));
  it("rejects Journal form workflow payloads", () => expectRule(fixture({ clientSource: client.replace('title: initialData?.title ?? "",', 'status: initialData?.status ?? "DRAFT", title: initialData?.title ?? "",') }), "G-JOURNAL-03"));
  it("rejects a legacy category in the canonical dropdown", () => expectRule(fixture({ clientSource: client.replace('{ label: "器物", value: "OBJECT" },', '{ label: "器物志", value: "ARTIFACT" },') }), "G-JOURNAL-04"));
  it("rejects removed category compatibility and rejection rules", () => {
    expectRule(fixture({ actionSource: actions.replace('["ARTIFACT", JournalCategory.OBJECT]', '["ARTIFACT", JournalCategory.MATERIAL]') }), "G-JOURNAL-05");
    expectRule(fixture({ actionSource: actions.replace('value === "TRAVELER"', 'value === "VOYAGER"') }), "G-JOURNAL-08");
    expectRule(fixture({ actionSource: actions.replace('value === "OTHER"', 'value === "MISC"') }), "G-JOURNAL-09");
  });
  it("allows the Publisher wrapper while rejecting Runtime DDL", () => {
    assert.deepEqual(validateJournalContract(fixture({ actionSource: actions.replace('const TABLE = "journal_posts";', 'const TABLE = "journal_posts";\n// Publisher owns status.')})), []);
    expectRule(fixture({ actionSource: actions.replace('const TABLE = "journal_posts";', 'const TABLE = "journal_posts";\nCREATE TABLE journal_bad (id text);') }), "G-JOURNAL-12");
  });
});
