import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frozenSchemas = [
  { app: "brand-os", relativePath: "apps/brand-os/prisma/schema.prisma", output: "../node_modules/@prisma/brand-client" },
  { app: "erp", relativePath: "apps/erp/prisma/schema.prisma", output: undefined },
];

const requiredFrozenMappings = new Map([
  ["remainingQuantity", "remaining_qty"],
  ["companionsCount", "companions_count"],
  ["seriesId", "series_id"],
  ["publishStatus", "publish_status"],
  ["productType", "product_type"],
  ["erpProductId", "erp_product_id"],
]);

const brandPhysicalTables = [
  "products", "series", "materials", "tags", "product_tags", "media", "journal_posts",
  "banners", "contact_leads", "page_contents", "seo_configs", "site_settings", "publish_jobs",
  "content_versions", "seo_snapshots", "brand_product_content", "brand_materials", "journal_tags",
  "product_materials", "orders", "admin_users", "audit_logs",
];

const forbiddenFutureTables = ["brand_products", "brand_series", "brand_tags", "brand_product_tags"];
const publishStatusValues = ["DRAFT", "PENDING_REVIEW", "APPROVED", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"];

function parseNamedBlocks(schema, kind) {
  const blocks = new Map();
  const startPattern = new RegExp(`\\b${kind}\\s+(\\w+)\\s*\\{`, "g");
  let match;
  while ((match = startPattern.exec(schema))) {
    const openIndex = schema.indexOf("{", match.index);
    let depth = 0;
    let endIndex = -1;
    for (let index = openIndex; index < schema.length; index += 1) {
      if (schema[index] === "{") depth += 1;
      if (schema[index] === "}") depth -= 1;
      if (depth === 0) {
        endIndex = index;
        break;
      }
    }
    if (endIndex === -1) continue;
    blocks.set(match[1], schema.slice(openIndex + 1, endIndex));
    startPattern.lastIndex = endIndex + 1;
  }
  return blocks;
}

function mapValue(block) {
  return block.match(/@@map\(\s*"([^"]+)"\s*\)/)?.[1];
}

function parseFields(block) {
  const fields = new Map();
  for (const sourceLine of block.split("\n")) {
    const line = sourceLine.replace(/\/\/.*$/, "").trim();
    const match = line.match(/^(\w+)\s+([A-Za-z]\w*(?:\[\])?\??)(?=\s|@|$)(.*)$/);
    if (match && !match[1].startsWith("@@")) {
      fields.set(match[1], { type: match[2], rest: match[3], line });
    }
  }
  return fields;
}

function fieldMapping(fields, name) {
  return fields.get(name)?.rest.match(/@map\(\s*"([^"]+)"\s*\)/)?.[1];
}

function relationArgument(field, argument) {
  return field?.rest.match(new RegExp(`${argument}:\\s*\\[\\s*(\\w+)\\s*\\]`))?.[1];
}

function relationAction(field, action) {
  return field?.rest.match(new RegExp(`${action}:\\s*(\\w+)`))?.[1];
}

function datasourceContract(schema) {
  const block = parseNamedBlocks(schema, "datasource").values().next().value;
  if (!block) return { error: "missing datasource block" };
  return {
    provider: block.match(/\bprovider\s*=\s*"([^"]+)"/)?.[1],
    urlEnv: block.match(/\burl\s*=\s*env\("([^"]+)"\)/)?.[1],
    directUrlEnv: block.match(/\bdirectUrl\s*=\s*env\("([^"]+)"\)/)?.[1],
  };
}

function generatorContract(schema) {
  const block = parseNamedBlocks(schema, "generator").get("client");
  if (!block) return { error: "missing generator client block" };
  return {
    provider: block.match(/\bprovider\s*=\s*"([^"]+)"/)?.[1],
    output: block.match(/\boutput\s*=\s*"([^"]+)"/)?.[1],
  };
}

function withoutComments(schema) {
  return schema
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("///"))
    .join("\n");
}

function addFieldError(errors, schemaPath, modelName, fieldName, expected, actual) {
  errors.push(`${schemaPath}: ${modelName}.${fieldName} contract failed — expected ${expected}; actual ${actual}`);
}

function validateCanonicalWriteContract(schemaPath, models, errors) {
  const contracts = [
    ["ADR-003", "JournalPost", "id", /@default\(\s*cuid\(\)\s*\)/, "@default(cuid())"],
    ["ADR-003", "JournalPost", "updatedAt", /@updatedAt\b/, "@updatedAt"],
    ["ADR-003", "PageContent", "id", /@default\(\s*cuid\(\)\s*\)/, "@default(cuid())"],
    ["ADR-003", "PageContent", "updatedAt", /@updatedAt\b/, "@updatedAt"],
    ["ADR-003", "AuditLog", "id", /@default\(\s*cuid\(\)\s*\)/, "@default(cuid())"],
    ["ADR-003", "AdminUser", "id", /@default\(\s*cuid\(\)\s*\)/, "@default(cuid())"],
    ["ADR-003", "AdminUser", "updatedAt", /@updatedAt\b/, "@updatedAt"],
    ["ADR-004", "LegacyBrandProduct", "updatedAt", /@updatedAt\b/, "@updatedAt"],
    ["ADR-004", "LegacyBrandSeries", "id", /@default\(\s*autoincrement\(\)\s*\)/, "@default(autoincrement())"],
    ["ADR-004", "LegacyBrandSeries", "updatedAt", /@updatedAt\b/, "@updatedAt"],
    ["ADR-004", "LegacyBrandMaterial", "id", /@default\(\s*autoincrement\(\)\s*\)/, "@default(autoincrement())"],
    ["ADR-004", "LegacyBrandMaterial", "updatedAt", /@updatedAt\b/, "@updatedAt"],
    ["ADR-004", "Media", "id", /@default\(\s*cuid\(\)\s*\)/, "@default(cuid())"],
    ["ADR-004", "SeoConfig", "id", /@default\(\s*cuid\(\)\s*\)/, "@default(cuid())"],
    ["ADR-004", "SeoConfig", "updatedAt", /@updatedAt\b/, "@updatedAt"],
    ["ADR-004", "SiteSetting", "id", /@default\(\s*cuid\(\)\s*\)/, "@default(cuid())"],
    ["ADR-004", "SiteSetting", "updatedAt", /@updatedAt\b/, "@updatedAt"],
    ["ADR-004", "Tag", "id", /@default\(\s*cuid\(\)\s*\)/, "@default(cuid())"],
    ["ADR-004", "ProductTag", "id", /@default\(\s*cuid\(\)\s*\)/, "@default(cuid())"],
    ["ADR-004", "LegacyJournalTag", "id", /@default\(\s*cuid\(\)\s*\)/, "@default(cuid())"],
  ];
  for (const [adr, modelName, fieldName, pattern, expected] of contracts) {
    const field = models.has(modelName) ? parseFields(models.get(modelName)).get(fieldName) : undefined;
    if (!field || !pattern.test(field.rest)) errors.push(`${schemaPath}: ${adr} ${modelName}.${fieldName} contract failed — expected ${expected}; actual ${field?.line ?? "missing"}`);
  }
  const admin = models.get("AdminUser") ?? "";
  const adminEmail = parseFields(admin).get("email");
  if (adminEmail?.type !== "String" || /@unique\b/.test(adminEmail?.rest ?? "")) errors.push(`${schemaPath}: ADR-003 AdminUser.email contract failed — expected String without @unique; actual ${adminEmail?.line ?? "missing"}`);
  if (/@@unique\(\s*\[\s*email\s*\]\s*\)/.test(admin)) errors.push(`${schemaPath}: ADR-003 AdminUser model contract failed — expected no @@unique([email]); actual annotation found`);
  const leads = parseFields(models.get("ContactLead") ?? "");
  if (leads.get("wechat")?.type !== "String?" || fieldMapping(leads, "wechat") || leads.has("we_chat")) errors.push(`${schemaPath}: ADR-003 ContactLead.wechat contract failed — expected String? without @map and no we_chat field; actual ${leads.get("wechat")?.line ?? "missing"}`);
  for (const [modelName, fieldName] of [["ContactLead", "id"], ["LegacyOrder", "id"], ["LegacyBrandMaterialLink", "id"]]) {
    const field = models.has(modelName) ? parseFields(models.get(modelName)).get(fieldName) : undefined;
    if (/@default\(/.test(field?.rest ?? "")) errors.push(`${schemaPath}: ADR-004 ${modelName}.${fieldName} contract failed — expected no unapproved default; actual ${field.line}`);
  }
}

function validateBannerIdContract(schemaPath, models, errors) {
  const field = models.has("Banner") ? parseFields(models.get("Banner")).get("id") : undefined;
  const expected = 'Int @id @default(autoincrement())';
  const hasExpectedDefault = /@default\(\s*autoincrement\(\)\s*\)/.test(field?.rest ?? "");
  if (field?.type !== "Int" || !/@id\b/.test(field?.rest ?? "") || !hasExpectedDefault) {
    errors.push(`${schemaPath}: G-BANNER-01 Banner.id contract failed — expected ${expected}; actual ${field?.line ?? "missing"}; see docs/PHASE_D2A_BANNER_ID_CONTRACT_DELTA_REVIEW_2026-07-13.md`);
  }
}

function validateBrandTagRelations(schemaPath, models, errors) {
  const relationContracts = [
    { model: "Tag", field: "productTags", type: "ProductTag[]" },
    { model: "Tag", field: "journalTags", type: "LegacyJournalTag[]" },
    { model: "ProductTag", field: "product", type: "LegacyBrandProduct", fields: "productId", references: "id" },
    { model: "ProductTag", field: "tag", type: "Tag", fields: "tagId", references: "id" },
    { model: "LegacyJournalTag", field: "journal", type: "JournalPost", fields: "journalId", references: "id" },
    { model: "LegacyJournalTag", field: "tag", type: "Tag", fields: "tagId", references: "id" },
  ];

  for (const contract of relationContracts) {
    const block = models.get(contract.model);
    const fields = block ? parseFields(block) : new Map();
    const field = fields.get(contract.field);
    if (field?.type !== contract.type) {
      addFieldError(errors, schemaPath, contract.model, contract.field, contract.type, field?.type ?? "missing");
      continue;
    }
    if (!contract.fields) continue;

    const actualFields = relationArgument(field, "fields");
    const actualReferences = relationArgument(field, "references");
    if (!fields.has(contract.fields)) {
      addFieldError(errors, schemaPath, contract.model, contract.field, `existing scalar field ${contract.fields}`, "missing scalar field");
    }
    if (actualFields !== contract.fields) {
      addFieldError(errors, schemaPath, contract.model, contract.field, `@relation(fields: [${contract.fields}])`, actualFields ? `@relation(fields: [${actualFields}])` : "missing relation fields");
    }
    if (actualReferences !== contract.references) {
      addFieldError(errors, schemaPath, contract.model, contract.field, `references: [${contract.references}]`, actualReferences ? `references: [${actualReferences}]` : "missing relation references");
    }
    for (const action of ["onDelete", "onUpdate"]) {
      const actualAction = relationAction(field, action);
      if (actualAction && actualAction !== "NoAction") {
        addFieldError(errors, schemaPath, contract.model, contract.field, `${action}: NoAction or omitted (Prisma relation only; no DB FK)`, `${action}: ${actualAction}`);
      }
    }
  }

  for (const [modelName, block] of models) {
    const fields = parseFields(block);
    for (const [fieldName, field] of fields) {
      if (!field.type.endsWith("[]")) continue;
      const target = models.get(field.type.slice(0, -2));
      const targetFields = target && parseFields(target);
      const inverseList = targetFields && [...targetFields.values()].some((candidate) => candidate.type === `${modelName}[]`);
      if (inverseList) {
        errors.push(`${schemaPath}: implicit many-to-many contract failed — expected explicit join models only; actual ${modelName}.${fieldName} and ${field.type.slice(0, -2)} declare list-to-list relations`);
      }
    }
  }
}

function validateBrandSchemaContract(rootDir, errors) {
  const schemaPath = path.join(rootDir, "packages/brand-db/schema.prisma");
  let schema;
  try {
    schema = fs.readFileSync(schemaPath, "utf8");
  } catch {
    errors.push(`${schemaPath}: Brand Runtime canonical schema is required`);
    return;
  }

  const datasource = datasourceContract(schema);
  if (datasource.provider !== "postgresql" || datasource.urlEnv !== "BRAND_DATABASE_URL") {
    errors.push(`${schemaPath}: Brand datasource contract failed — expected provider postgresql and env("BRAND_DATABASE_URL"); actual provider ${datasource.provider ?? "missing"} and ${datasource.urlEnv ? `env("${datasource.urlEnv}")` : "non-env or missing url"}`);
  }
  if (/env\(\s*"DATABASE_URL"\s*\)/.test(schema)) {
    errors.push(`${schemaPath}: Brand datasource contract failed — expected no env("DATABASE_URL") fallback; actual DATABASE_URL reference found`);
  }
  if (/\bpostgres(?:ql)?:\/\//i.test(withoutComments(schema))) {
    errors.push(`${schemaPath}: Brand datasource contract failed — expected no hardcoded PostgreSQL URL; actual URL literal found`);
  }

  const generator = generatorContract(schema);
  if (generator.provider !== "prisma-client-js" || generator.output !== "./node_modules/@prisma/brand-client") {
    errors.push(`${schemaPath}: Brand generator contract failed — expected prisma-client-js output ./node_modules/@prisma/brand-client; actual provider ${generator.provider ?? "missing"}, output ${generator.output ?? "default or missing"}`);
  }
  if (generator.output?.includes("@prisma/client") || generator.output?.includes("packages/db")) {
    errors.push(`${schemaPath}: Brand generator contract failed — expected an isolated Brand client output; actual ${generator.output}`);
  }

  const models = parseNamedBlocks(schema, "model");
  const mappedTables = new Map();
  for (const [modelName, block] of models) {
    const table = mapValue(block);
    if (table) mappedTables.set(table, modelName);
  }
  for (const table of brandPhysicalTables) {
    if (!mappedTables.has(table)) {
      errors.push(`${schemaPath}: Brand physical table mapping failed — expected @@map("${table}"); actual mapping is missing`);
    }
  }
  for (const table of forbiddenFutureTables) {
    if (mappedTables.has(table)) {
      errors.push(`${schemaPath}: future-target mapping failed — expected no @@map("${table}"); actual model ${mappedTables.get(table)} maps it`);
    }
  }
  const materialLinkModel = mappedTables.get("brand_materials");
  if (materialLinkModel === "BrandMaterial" || !/(Legacy|Link)/.test(materialLinkModel ?? "")) {
    errors.push(`${schemaPath}: brand_materials semantic contract failed — expected a Legacy or Link model for the existing supplemental table; actual ${materialLinkModel ?? "missing"}`);
  }

  const enumBlock = parseNamedBlocks(schema, "enum").get("PublishStatus");
  const actualEnumValues = enumBlock
    ? enumBlock.split("\n").map((line) => line.trim()).filter((line) => /^\w+$/.test(line))
    : [];
  if (actualEnumValues.join(",") !== publishStatusValues.join(",")) {
    errors.push(`${schemaPath}: PublishStatus enum contract failed — expected ${publishStatusValues.join(", ")}; actual ${actualEnumValues.join(", ") || "missing"}`);
  }

  const fieldContracts = [
    { model: "LegacyBrandProduct", table: "products", field: "status", type: "String" },
    { model: "LegacyBrandProduct", table: "products", field: "publishStatus", type: "PublishStatus", map: "publish_status" },
    { model: "LegacyBrandSeries", table: "series", field: "status", type: "String?" },
    { model: "JournalPost", table: "journal_posts", field: "status", type: "PublishStatus" },
    { model: "Banner", table: "banners", field: "status", type: "String?" },
    { model: "PublishJob", table: "publish_jobs", field: "status", type: "String?" },
    { model: "ContentVersion", table: "content_versions", field: "status", type: "String?" },
  ];
  for (const contract of fieldContracts) {
    const block = models.get(contract.model);
    if (!block) {
      errors.push(`${schemaPath}: ${contract.model} contract failed — expected model mapped to ${contract.table}; actual model is missing`);
      continue;
    }
    const fields = parseFields(block);
    const field = fields.get(contract.field);
    if (field?.type !== contract.type) {
      addFieldError(errors, schemaPath, contract.model, contract.field, contract.type, field?.type ?? "missing");
    }
    if (contract.map && fieldMapping(fields, contract.field) !== contract.map) {
      addFieldError(errors, schemaPath, contract.model, contract.field, `@map("${contract.map}")`, fieldMapping(fields, contract.field) ? `@map("${fieldMapping(fields, contract.field)}")` : "missing @map");
    }
  }

  validateBrandTagRelations(schemaPath, models, errors);
  validateCanonicalWriteContract(schemaPath, models, errors);
  validateBannerIdContract(schemaPath, models, errors);
}

export function validatePrismaSchemaContract(rootDir) {
  const errors = [];
  const canonicalPath = path.join(rootDir, "packages/db/schema.prisma");
  let canonical;
  try {
    canonical = fs.readFileSync(canonicalPath, "utf8");
  } catch {
    return [`${canonicalPath}: unable to read canonical schema`];
  }

  const canonicalDatasource = datasourceContract(canonical);
  if (canonicalDatasource.provider !== "postgresql" || canonicalDatasource.urlEnv !== "DATABASE_URL") {
    errors.push(`${canonicalPath}: datasource must use provider postgresql and env("DATABASE_URL")`);
  }
  if (canonicalDatasource.directUrlEnv && canonicalDatasource.directUrlEnv !== "DIRECT_DATABASE_URL") {
    errors.push(`${canonicalPath}: directUrl must use env("DIRECT_DATABASE_URL") when declared`);
  }

  for (const frozen of frozenSchemas) {
    const schemaPath = path.join(rootDir, frozen.relativePath);
    let schema;
    try {
      schema = fs.readFileSync(schemaPath, "utf8");
    } catch {
      errors.push(`${schemaPath}: unable to read frozen schema`);
      continue;
    }
    if (!/\bFROZEN\b/.test(schema)) errors.push(`${schemaPath}: missing FROZEN ownership marker`);
    if (!/packages\/db\/schema\.prisma/.test(schema)) errors.push(`${schemaPath}: missing canonical ownership reference to packages/db/schema.prisma`);
    if (!/migrate/i.test(schema) || !/db:push|db push/i.test(schema)) errors.push(`${schemaPath}: missing migration/db push prohibition marker`);
    if (!/Phase\s*3[^\n]*(?:删除|delete)/i.test(schema)) errors.push(`${schemaPath}: missing Phase 3 deletion marker`);

    const datasource = datasourceContract(schema);
    if (datasource.provider !== "postgresql" || datasource.urlEnv !== "DATABASE_URL") {
      errors.push(`${schemaPath}: datasource must use provider postgresql and env("DATABASE_URL")`);
    }
    if (datasource.directUrlEnv && datasource.directUrlEnv !== "DIRECT_DATABASE_URL") {
      errors.push(`${schemaPath}: directUrl must use env("DIRECT_DATABASE_URL") when declared`);
    }
    const generator = generatorContract(schema);
    if (generator.provider !== "prisma-client-js") errors.push(`${schemaPath}: generator client must use prisma-client-js`);
    if (generator.output !== frozen.output) errors.push(`${schemaPath}: generator output must be ${frozen.output ?? "the default @prisma/client output"}`);

    const fields = parseFields(schema);
    if (/@map\(\s*"remaining_quantity"\s*\)/.test(schema)) errors.push(`${schemaPath}: remaining_quantity is forbidden; use remaining_qty`);
    for (const [field, expectedMapping] of requiredFrozenMappings) {
      if (fields.has(field) && fieldMapping(fields, field) !== expectedMapping) errors.push(`${schemaPath}: ${field} must map to ${expectedMapping}`);
    }
    if (/\b(?:migrate|db\s*push|db:push)\b/i.test(withoutComments(schema))) errors.push(`${schemaPath}: frozen schema must not declare independent migration ownership`);
  }

  validateBrandSchemaContract(rootDir, errors);
  return errors;
}

function main() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const errors = validatePrismaSchemaContract(rootDir);
  if (errors.length > 0) {
    console.error("Prisma schema contract check failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log("Prisma schema contract check passed.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
