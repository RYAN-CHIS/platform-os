import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PRODUCT_ACTIONS_PATH = "apps/platform/modules/brand/products/actions.ts";
const PRODUCT_CLIENT_PATH = "apps/platform/app/(platform)/brand/products/client.tsx";

function readFile(rootDir, relativePath, errors) {
  try {
    return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  } catch {
    errors.push(`G-PROD-00 ${relativePath}: required source file is missing`);
    return "";
  }
}

function blockAfter(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) return "";
  const open = source.indexOf("{", start);
  if (open < 0) return "";
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  return source.slice(start);
}

function namedFunctionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) return "";
  const signatureEnd = /\)\s*\{/.exec(source.slice(start));
  if (!signatureEnd) return "";
  const open = start + signatureEnd.index + signatureEnd[0].lastIndexOf("{");
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  return source.slice(start);
}

function constArrayBlock(source, name) {
  const start = source.indexOf(`const ${name}`);
  if (start < 0) return "";
  const end = source.indexOf("] as const", start);
  return end < 0 ? source.slice(start) : source.slice(start, end + "] as const".length);
}

export function validateProductStatusOwnership(rootDir) {
  const errors = [];
  const actions = readFile(rootDir, PRODUCT_ACTIONS_PATH, errors);
  const client = readFile(rootDir, PRODUCT_CLIENT_PATH, errors);
  if (!actions || !client) return errors;

  const updateFields = constArrayBlock(actions, "PRODUCT_UPDATE_FIELDS");
  if (!updateFields) {
    errors.push(`G-PROD-01 ${PRODUCT_ACTIONS_PATH}: PRODUCT_UPDATE_FIELDS whitelist is missing`);
  } else if (/['\"]status['\"]/.test(updateFields)) {
    errors.push(`G-PROD-01 ${PRODUCT_ACTIONS_PATH}: ordinary Product update whitelist must not include status`);
  }
  if (!updateFields) {
    errors.push(`G-PROD-02 ${PRODUCT_ACTIONS_PATH}: PRODUCT_UPDATE_FIELDS whitelist is missing`);
  } else if (/['\"](?:publish_status|publishStatus)['\"]/.test(updateFields)) {
    errors.push(`G-PROD-02 ${PRODUCT_ACTIONS_PATH}: ordinary Product update whitelist must not include publishStatus or publish_status`);
  }

  const refresh = blockAfter(actions, "async function refreshLinkedErpFields");
  if (!refresh) {
    errors.push(`G-PROD-03 ${PRODUCT_ACTIONS_PATH}: refreshLinkedErpFields is missing`);
  } else if (/\b(?:status|publishStatus)\s*:/.test(refresh)) {
    errors.push(`G-PROD-03 ${PRODUCT_ACTIONS_PATH}: ERP refresh must not write Product.status or Product.publishStatus`);
  }

  const productForm = namedFunctionBlock(client, "ProductFormModal");
  if (!productForm) {
    errors.push(`G-PROD-04 ${PRODUCT_CLIENT_PATH}: ProductFormModal is missing`);
  } else if (/setField\(\s*["'](?:status|publish_status|publishStatus)["']/.test(productForm) || /\b(?:status|publish_status|publishStatus)\s*:/.test(productForm)) {
    errors.push(`G-PROD-04 ${PRODUCT_CLIENT_PATH}: ordinary Product form must not submit status or publishStatus`);
  }
  return errors;
}

function main() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const errors = validateProductStatusOwnership(rootDir);
  if (errors.length) {
    console.error("Product status ownership guard failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log("Product status ownership guard passed.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
