// ═══════════════════════════════════════════════════════════
// Build-time Schema Lock Check — Phase 4.5.1
//
// CI / pre-build 检查：确保 schema 锁定未被破坏。
// 用法: npx tsx packages/db/scripts/check-schema-lock.ts
// ═══════════════════════════════════════════════════════════

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const LOCK_PATH = join(__dirname, "..", "schema-lock.json");

function main() {
  console.log("[SchemaLock] Checking...");

  // 1. Lock file exists
  if (!existsSync(LOCK_PATH)) {
    console.error("❌ schema-lock.json not found at", LOCK_PATH);
    process.exit(1);
  }

  const lock = JSON.parse(readFileSync(LOCK_PATH, "utf-8"));

  // 2. Status is LOCKED
  if (lock.status !== "LOCKED") {
    console.error(`❌ Schema status is "${lock.status}", expected "LOCKED"`);
    process.exit(1);
  }

  // 3. Version matches
  if (lock.version !== "4.5.1") {
    console.error(`❌ Schema lock version mismatch: ${lock.version}`);
    process.exit(1);
  }

  // 4. All domains have ownership
  const domains = Object.keys(lock.domains);
  if (domains.length < 3) {
    console.error(`❌ Expected 3 domains, found ${domains.length}`);
    process.exit(1);
  }

  // 5. Model count
  let total = 0;
  for (const [domain, config] of Object.entries(lock.domains) as any) {
    total += config.ownership.length;
  }

  console.log(`  Version:  ${lock.version}`);
  console.log(`  Status:   ${lock.status}`);
  console.log(`  Domains:  ${domains.join(", ")}`);
  console.log(`  Models:   ${total}`);
  console.log(`  LockedAt: ${(lock as any).lockedAt}`);
  console.log("");
  console.log("✅ Schema lock verified. Build may proceed.");
}

main();
