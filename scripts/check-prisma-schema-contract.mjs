import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frozenSchemas = [
  { app: "brand-os", relativePath: "apps/brand-os/prisma/schema.prisma", output: "../node_modules/@prisma/brand-client" },
  { app: "web", relativePath: "apps/web/prisma/schema.prisma", output: "../node_modules/@prisma/web-client" },
  { app: "erp", relativePath: "apps/erp/prisma/schema.prisma", output: undefined },
];

const requiredMappings = new Map([
  ["remainingQuantity", "remaining_qty"],
  ["companionsCount", "companions_count"],
  ["seriesId", "series_id"],
  ["publishStatus", "publish_status"],
  ["productType", "product_type"],
  ["erpProductId", "erp_product_id"],
]);

function fieldMapping(schema, field) {
  const match = schema.match(new RegExp(`^\\s*${field}\\b[^\\n]*@map\\(\\s*"([^"]+)"\\s*\\)`, "m"));
  return match?.[1];
}

function hasField(schema, field) {
  return new RegExp(`^\\s*${field}\\b`, "m").test(schema);
}

function datasourceContract(schema) {
  const block = schema.match(/datasource\s+\w+\s*\{([\s\S]*?)\}/)?.[1];
  if (!block) return { error: "missing datasource block" };

  const provider = block.match(/\bprovider\s*=\s*"([^"]+)"/)?.[1];
  const urlEnv = block.match(/\burl\s*=\s*env\("([^"]+)"\)/)?.[1];
  const directUrlEnv = block.match(/\bdirectUrl\s*=\s*env\("([^"]+)"\)/)?.[1];
  return { provider, urlEnv, directUrlEnv };
}

function withoutComments(schema) {
  return schema
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("///"))
    .join("\n");
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
    errors.push(`${canonicalPath}: datasource must use provider postgresql and env(\"DATABASE_URL\")`);
  }
  if (canonicalDatasource.directUrlEnv && canonicalDatasource.directUrlEnv !== "DIRECT_DATABASE_URL") {
    errors.push(`${canonicalPath}: directUrl must use env(\"DIRECT_DATABASE_URL\") when declared`);
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

    if (!/\bFROZEN\b/.test(schema)) {
      errors.push(`${schemaPath}: missing FROZEN ownership marker`);
    }
    if (!/packages\/db\/schema\.prisma/.test(schema)) {
      errors.push(`${schemaPath}: missing canonical ownership reference to packages/db/schema.prisma`);
    }
    if (!/migrate/i.test(schema) || !/db:push|db push/i.test(schema)) {
      errors.push(`${schemaPath}: missing migration/db push prohibition marker`);
    }
    if (!/Phase\s*3[^\n]*(?:删除|delete)/i.test(schema)) {
      errors.push(`${schemaPath}: missing Phase 3 deletion marker`);
    }

    const datasource = datasourceContract(schema);
    if (datasource.provider !== "postgresql" || datasource.urlEnv !== "DATABASE_URL") {
      errors.push(`${schemaPath}: datasource must use provider postgresql and env(\"DATABASE_URL\")`);
    }
    if (datasource.directUrlEnv && datasource.directUrlEnv !== "DIRECT_DATABASE_URL") {
      errors.push(`${schemaPath}: directUrl must use env(\"DIRECT_DATABASE_URL\") when declared`);
    }

    const generator = schema.match(/generator\s+client\s*\{([\s\S]*?)\}/)?.[1];
    if (!generator?.match(/\bprovider\s*=\s*"prisma-client-js"/)) {
      errors.push(`${schemaPath}: generator client must use prisma-client-js`);
    }
    const generatedOutput = generator?.match(/\boutput\s*=\s*"([^"]+)"/)?.[1];
    if (generatedOutput !== frozen.output) {
      errors.push(`${schemaPath}: generator output must be ${frozen.output ?? "the default @prisma/client output"}`);
    }

    if (/@map\(\s*"remaining_quantity"\s*\)/.test(schema)) {
      errors.push(`${schemaPath}: remaining_quantity is forbidden; use remaining_qty`);
    }
    for (const [field, expectedMapping] of requiredMappings) {
      if (hasField(schema, field) && fieldMapping(schema, field) !== expectedMapping) {
        errors.push(`${schemaPath}: ${field} must map to ${expectedMapping}`);
      }
    }

    if (/\b(?:migrate|db\s*push|db:push)\b/i.test(withoutComments(schema))) {
      errors.push(`${schemaPath}: frozen schema must not declare independent migration ownership`);
    }
  }

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
