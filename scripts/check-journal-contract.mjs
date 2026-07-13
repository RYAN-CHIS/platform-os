import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ACTIONS_PATH = "apps/platform/modules/brand/journal/actions.ts";
const CLIENT_PATH = "apps/platform/app/(platform)/brand/journal/client.tsx";
const CANONICAL_CATEGORIES = ["OBJECT", "MATERIAL", "CRAFT", "DONGHAI", "CREATION", "PHILOSOPHY"];

function readFile(rootDir, relativePath, errors) {
  try {
    return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  } catch {
    errors.push(`G-JOURNAL-00 ${relativePath}: required source file is missing`);
    return "";
  }
}

function constArrayBlock(source, name) {
  const start = source.indexOf(`const ${name}`);
  if (start < 0) return "";
  const end = source.indexOf("] as const", start);
  return end < 0 ? source.slice(start) : source.slice(start, end + "] as const".length);
}

function namedFunctionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) return "";
  const signature = /\)\s*(?::[^\{]+)?\{/.exec(source.slice(start));
  if (!signature) return "";
  const open = start + signature.index + signature[0].lastIndexOf("{");
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  return source.slice(start);
}

function contractCategory(input) {
  if (typeof input !== "string" || !input.trim()) throw new Error("invalid category");
  const value = input.trim().toUpperCase();
  const aliases = new Map([["ARTIFACT", "OBJECT"], ["BRAND", "PHILOSOPHY"], ["CRAFT", "CRAFT"]]);
  if (aliases.has(value)) return aliases.get(value);
  if (CANONICAL_CATEGORIES.includes(value)) return value;
  throw new Error("invalid category");
}

export function resolveJournalCategoryContract(input) {
  return contractCategory(input);
}

export function validateJournalContract(rootDir) {
  const errors = [];
  const actions = readFile(rootDir, ACTIONS_PATH, errors);
  const client = readFile(rootDir, CLIENT_PATH, errors);
  if (!actions || !client) return errors;

  const updateFields = actions.includes("const JOURNAL_UPDATE_FIELDS = JOURNAL_CREATE_FIELDS;")
    ? constArrayBlock(actions, "JOURNAL_CREATE_FIELDS")
    : constArrayBlock(actions, "JOURNAL_UPDATE_FIELDS");
  if (!updateFields || /['\"]status['\"]/.test(updateFields)) errors.push(`G-JOURNAL-01 ${ACTIONS_PATH}: ordinary update whitelist must not include status`);
  if (!/status:\s*PublishStatus\.DRAFT/.test(actions) || !/mode === "create"\) continue/.test(actions)) errors.push(`G-JOURNAL-02 ${ACTIONS_PATH}: ordinary create must ignore caller workflow fields and persist DRAFT`);

  const postForm = namedFunctionBlock(client, "PostFormModal");
  if (!postForm || /\b(?:status|publishStatus|publish_status|workflowState)\s*:|setField\(\s*["'](?:status|publishStatus|publish_status|workflowState)["']/.test(postForm)) errors.push(`G-JOURNAL-03 ${CLIENT_PATH}: ordinary Journal form must not submit workflow fields`);

  const categoryOptions = client.slice(client.indexOf("const CATEGORY_OPTIONS"), client.indexOf("const CSV_COLUMNS"));
  const categoryValues = [...categoryOptions.matchAll(/value:\s*["']([^"']+)["']/g)].map((match) => match[1]);
  if (categoryValues.length !== CANONICAL_CATEGORIES.length || CANONICAL_CATEGORIES.some((value) => !categoryValues.includes(value))) errors.push(`G-JOURNAL-04 ${CLIENT_PATH}: Journal dropdown must contain only Canonical JournalCategory values`);

  const resolver = namedFunctionBlock(actions, "resolveJournalCategory");
  const categoryRules = [
    ["G-JOURNAL-05", /\["ARTIFACT",\s*JournalCategory\.OBJECT\]/, "ARTIFACT must map to OBJECT"],
    ["G-JOURNAL-06", /\["BRAND",\s*JournalCategory\.PHILOSOPHY\]/, "BRAND must map to PHILOSOPHY"],
    ["G-JOURNAL-07", /\["CRAFT",\s*JournalCategory\.CRAFT\]/, "CRAFT must map to CRAFT"],
    ["G-JOURNAL-08", /value === "TRAVELER"/, "TRAVELER must be rejected"],
    ["G-JOURNAL-09", /value === "OTHER"/, "OTHER must be rejected"],
    ["G-JOURNAL-10", /不是有效的文章分类/, "unknown categories must be rejected"],
  ];
  for (const [rule, pattern, message] of categoryRules) if (!pattern.test(actions)) errors.push(`${rule} ${ACTIONS_PATH}: ${message}`);
  if (!resolver) errors.push(`G-JOURNAL-10 ${ACTIONS_PATH}: resolveJournalCategory is missing`);

  if (!/export async function togglePostStatus[\s\S]*?publisherCommandFromLegacyStatus\(newStatus\)[\s\S]*?transitionStatus\("journal", cuid, command\)/.test(actions)) errors.push(`G-JOURNAL-11 ${ACTIONS_PATH}: Publisher wrapper must validate legacy input at the Publisher boundary`);

  const ordinarySource = actions.slice(0, actions.indexOf("// ── Publishing Workflow"));
  if (/\b(?:CREATE|ALTER|DROP)\s+TABLE\b/i.test(ordinarySource)) errors.push(`G-JOURNAL-12 ${ACTIONS_PATH}: ordinary Journal CRUD must not contain Runtime DDL`);
  return errors;
}

function main() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const errors = validateJournalContract(rootDir);
  if (errors.length) {
    console.error("Journal contract guard failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log("Journal contract guard passed.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
