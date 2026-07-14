import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA = "packages/brand-db/schema.prisma";
const MATERIAL_FIELDS = new Map([
  ["slug", { type: "String", required: /@default\(""\)/ }],
  ["category", { type: "String", required: /@default\(""\)/ }],
  ["shortDesc", { type: "String?", map: "short_desc" }],
  ["story", { type: "String?" }],
  ["applicableProducts", { type: "String?", map: "applicable_products" }],
  ["status", { type: "String", required: /@default\("DRAFT"\)/ }],
  ["sortOrder", { type: "Int", map: "sort_order", required: /@default\(0\)/ }],
  ["coverImage", { type: "String?", map: "cover_image" }],
  ["detailImages", { type: "String", map: "detail_images", required: /@default\("\[\]"\)/ }],
  ["seoTitle", { type: "String?", map: "seo_title" }],
  ["seoDescription", { type: "String?", map: "seo_description" }],
  ["seoKeywords", { type: "String?", map: "seo_keywords" }],
  ["erpMaterialId", { type: "Int?", map: "erp_material_id" }],
]);
const MATERIAL_BASE_FIELDS = new Set([
  "id", "name", "type", "origin", "description", "image", "createdAt", "updatedAt",
  "alias", "features", "history", "relatedArticles", "productLinks",
]);

function model(schema, name) {
  const start = schema.match(new RegExp(`model\\s+${name}\\s*\\{`));
  if (!start || start.index === undefined) return "";
  const open = schema.indexOf("{", start.index);
  let depth = 0;
  for (let index = open; index < schema.length; index += 1) {
    if (schema[index] === "{") depth += 1;
    if (schema[index] === "}") depth -= 1;
    if (depth === 0) return schema.slice(open + 1, index);
  }
  return "";
}

function fields(block) {
  const result = new Map();
  for (const line of block.split("\n")) {
    const match = line.replace(/\/\/.*$/, "").trim().match(/^(\w+)\s+([A-Za-z]\w*(?:\[\])?\??)(.*)$/);
    if (match && !match[1].startsWith("@@")) result.set(match[1], { type: match[2], rest: match[3], line: match[0] });
  }
  return result;
}

function mapOf(field) {
  return field?.rest.match(/@map\("([^"]+)"\)/)?.[1];
}

function add(errors, rule, message) {
  errors.push(`${rule} ${SCHEMA}: ${message}`);
}

export function validateMaterialsSchemaContract(root, overrides = {}) {
  const errors = [];
  const schema = overrides.schema ?? fs.readFileSync(path.join(root, SCHEMA), "utf8");
  const material = model(schema, "LegacyBrandMaterial");
  const relation = model(schema, "LegacyProductMaterial");
  const legacy = model(schema, "LegacyBrandMaterialLink");
  const materialFields = fields(material);
  const relationFields = fields(relation);
  const legacyFields = fields(legacy);

  if (!/@@map\("materials"\)/.test(material)) add(errors, "G-MAT-SCHEMA-01", "LegacyBrandMaterial must map materials");
  if (!/@@map\("product_materials"\)/.test(relation)) add(errors, "G-MAT-SCHEMA-02", "LegacyProductMaterial must map product_materials");
  for (const [name, expected] of MATERIAL_FIELDS) {
    const field = materialFields.get(name);
    if (!field || field.type !== expected.type) add(errors, "G-MAT-SCHEMA-03", `LegacyBrandMaterial.${name} must be ${expected.type}`);
    if (expected.map && mapOf(field) !== expected.map) add(errors, "G-MAT-SCHEMA-04", `LegacyBrandMaterial.${name} must map ${expected.map}`);
    if (expected.required && !expected.required.test(field?.rest ?? "")) add(errors, "G-MAT-SCHEMA-04", `LegacyBrandMaterial.${name} has an incorrect default`);
  }
  for (const name of materialFields.keys()) {
    if (!MATERIAL_BASE_FIELDS.has(name) && !MATERIAL_FIELDS.has(name)) add(errors, "G-MAT-SCHEMA-14", `LegacyBrandMaterial.${name} is not approved`);
  }
  if (materialFields.get("status")?.type === "PublishStatus") add(errors, "G-MAT-SCHEMA-05", "Material status must not use PublishStatus");
  if (/\b(?:PENDING_REVIEW|APPROVED|PUBLISHED|UNPUBLISHED|IN_REVIEW|REJECTED|SCHEDULED)\b/.test(material)) add(errors, "G-MAT-SCHEMA-13", "Material status contract contains Publisher lifecycle values");
  if (/applicableProducts\s+\w+\[\]/.test(material) || /applicableProducts[^\n]*@relation/.test(material)) add(errors, "G-MAT-SCHEMA-06", "applicableProducts must be narrative text, not a relation");
  if (/erpMaterialId[^\n]*@relation|erpMaterialId[^\n]*@unique|@@(?:unique|index)\([^\n]*erpMaterialId/.test(material)) add(errors, "G-MAT-SCHEMA-07", "erpMaterialId must remain a nullable cross-database reference without relation, FK, or uniqueness");
  const sortOrder = relationFields.get("sortOrder");
  if (!sortOrder || sortOrder.type !== "Int" || mapOf(sortOrder) !== "sort_order" || !/@default\(0\)/.test(sortOrder.rest)) add(errors, "G-MAT-SCHEMA-08", "LegacyProductMaterial.sortOrder must be Int @default(0) @map(\"sort_order\")");
  if (!/@@unique\(\[productId, materialId\]\)/.test(relation)) add(errors, "G-MAT-SCHEMA-09", "LegacyProductMaterial must retain @@unique([productId, materialId])");
  if (!legacy || !/@@map\("brand_materials"\)/.test(legacy) || legacyFields.has("productId") || legacyFields.has("materialId") || /@relation\(/.test(legacy)) add(errors, "G-MAT-SCHEMA-10", "LegacyBrandMaterialLink must be a deprecated migration-only source, not a Product–Material relation");
  const brandMaterialsModels = [...schema.matchAll(/\bmodel\s+(\w+)\s*\{/g)]
    .map((match) => match[1])
    .filter((name) => /@@map\("brand_materials"\)/.test(model(schema, name)));
  if (brandMaterialsModels.length !== 1 || brandMaterialsModels[0] !== "LegacyBrandMaterialLink") add(errors, "G-MAT-SCHEMA-11", "brand_materials must only be represented by the migration-only LegacyBrandMaterialLink model");
  if (/ensureTable|ensureColumns|\$executeRawUnsafe/.test(schema)) add(errors, "G-MAT-SCHEMA-12", "Runtime DDL must not be declared in the Prisma schema");
  return errors;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const errors = validateMaterialsSchemaContract(root);
  if (errors.length) {
    console.error("Materials schema contract guard failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }
  console.log("Materials schema contract guard passed.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
