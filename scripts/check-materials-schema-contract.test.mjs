import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { validateMaterialsSchemaContract } from "./check-materials-schema-contract.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const schema = fs.readFileSync(path.join(root, "packages/brand-db/schema.prisma"), "utf8");
function errors(source = schema) { return validateMaterialsSchemaContract(root, { schema: source }); }
function fails(source, rule) { assert.ok(errors(source).some((error) => error.includes(rule))); }

test("accepts the approved Materials schema contract", () => assert.deepEqual(errors(), []));
test("all thirteen approved fields are present", () => assert.equal((schema.match(/\b(?:slug|category|shortDesc|story|applicableProducts|status|sortOrder|coverImage|detailImages|seoTitle|seoDescription|seoKeywords|erpMaterialId)\b/g) ?? []).length >= 13, true));
test("missing approved field fails", () => fails(schema.replace("seoKeywords        String?", "legacySeoKeywords  String?"), "G-MAT-SCHEMA-03"));
test("extra unapproved material field fails", () => fails(schema.replace("productLinks       LegacyProductMaterial[]", "unapprovedField    String\n  productLinks       LegacyProductMaterial[]"), "G-MAT-SCHEMA-14"));
test("PublishStatus material status fails", () => fails(schema.replace("status             String                  @default(\"DRAFT\")", "status             PublishStatus           @default(DRAFT)"), "G-MAT-SCHEMA-03"));
test("applicableProducts relation fails", () => fails(schema.replace("applicableProducts String?                 @map(\"applicable_products\")", "applicableProducts LegacyBrandProduct[]"), "G-MAT-SCHEMA-06"));
test("erpMaterialId cross-database relation fails", () => fails(schema.replace("erpMaterialId      Int?                    @map(\"erp_material_id\")", "erpMaterialId      Int?                    @relation(fields: [erpMaterialId], references: [id])"), "G-MAT-SCHEMA-07"));
test("sortOrder is declared on the canonical relation", () => assert.match(schema, /model LegacyProductMaterial[\s\S]*?sortOrder\s+Int\s+@default\(0\)\s+@map\("sort_order"\)/));
test("product-material unique pair is retained", () => assert.match(schema, /@@unique\(\[productId, materialId\]\)/));
test("brand_materials relation mapping fails", () => fails(schema.replace('@@map("brand_materials")', '@@map("product_materials")'), "G-MAT-SCHEMA-10"));
test("materials mapping is accepted", () => assert.equal(errors().some((error) => error.includes("G-MAT-SCHEMA-01")), false));
test("product_materials mapping is accepted", () => assert.equal(errors().some((error) => error.includes("G-MAT-SCHEMA-02")), false));
test("incorrect column map fails", () => fails(schema.replace('@map("seo_keywords")', '@map("seo_terms")'), "G-MAT-SCHEMA-04"));
test("legacy link production relation fields are rejected", () => fails(schema.replace("name               String    @unique", "productId          Int @map(\"product_id\")\n  name               String    @unique"), "G-MAT-SCHEMA-10"));
