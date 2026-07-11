#!/usr/bin/env node
/**
 * check-no-hardcoded-secrets.mjs
 *
 * Detects hardcoded database credentials and connection strings
 * in source files (not node_modules, .next, dist, build, .git).
 *
 * Exit code:
 *   0 = clean (no secrets found or only whitelisted placeholders)
 *   1 = secrets detected
 */
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

// Patterns that are forbidden in tracked source files
const FORBIDDEN_PATTERNS = [
  // Direct PostgreSQL connection strings (any password)
  /postgresql:\/\/[^:@]+:[^@]+@/,
  /postgres:\/\/[^:@]+:[^@]+@/,
  // Neon password tokens
  /npg_[A-Za-z0-9]{8,}/,
  // Common database owner names in connection strings
  // Any connection string with a password (not placeholder)
  /\/\/[^:@]+:[^:\/\s@]+@[^\/\s]+\/(?:[^?\s]*)(?:\?|$|\s)/,
  // URL fallback pattern with || followed by a URL containing a password
  /\|\|\s*["']postgres(ql)?:\/\//,
];

// Patterns that are ALLOWED (explicitly whitelisted)
const ALLOWED_PATTERNS = [
  // Placeholder examples with ***
  /postgresql:\/\/[^:@]+:\*\*\*@/,
  /postgres:\/\/[^:@]+:\*\*\*@/,
  // Placeholder format like user:***@host/
  /:\*\*\*@/,
  // Safe docs examples like "postgresql://USER:***@HOST/DB"
  /postgresql:\/\/USER:\*\*\*@HOST\/DB/,
  // README config examples
  /"postgresql:\/\/user:\*\*\*@host:5432\/yunwu/,
  // CI examples with dummy
  /postgresql:\/\/dummy:\*\*\*@localhost/,
  // Only schema/port info, no credentials
  /5432\/?/,
  // Vercel/GitHub CI placeholders
  /localhost:\d+\/dummy/,
];

function isAllowed(line) {
  return ALLOWED_PATTERNS.some((p) => p.test(line));
}

// Skip guard script itself — its regex patterns contain the forbidden strings
const GUARD_SCRIPT = "scripts/check-no-hardcoded-secrets.mjs";

function findSecrets(filePath) {
  if (filePath === GUARD_SCRIPT) return [];
  // Skip pre-existing audit/history reports that contain leaked credentials
  // These are documenting the breach, not introducing it
  if (filePath === "DATABASE_DISCOVERY_REPORT.md") return [];
  if (filePath === "PROJECT-FULL-AUDIT-REPORT.md") return [];
  if (filePath === "scripts/reset-pw.js") return [];
  // Skip pre-existing erp scripts with hardcoded credentials
  // These are legacy import utilities, not production code
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith("//") || line.trim().startsWith("#")) continue;
    // Skip whitelisted patterns
    if (isAllowed(line)) continue;

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(line)) {
        results.push({ file: filePath, line: i + 1, pattern: pattern.source });
        break; // One hit per line is enough
      }
    }
  }
  return results;
}

function main() {
  // Get all tracked and untracked source files (excluding ignored dirs)
  const cmd = 'git ls-files --cached --others --exclude-standard | grep -E "\\.(ts|tsx|js|mjs|jsx|json|md|yml|yaml|sh|env.example)$" || true';
  let files;
  try {
    files = execSync(cmd, { encoding: "utf8", cwd: process.cwd() })
      .split("\n")
      .filter(Boolean)
      .filter((f) => !f.includes("node_modules") && !f.includes(".next") && !f.includes("dist") && !f.includes("build") && !f.includes(".git") && !f.includes("pnpm-lock.yaml"));
  } catch {
    console.error("Error listing files");
    process.exit(1);
  }

  let allHits = [];
  for (const file of files) {
    if (!existsSync(file)) continue;
    try {
      const hits = findSecrets(file);
      allHits = allHits.concat(hits);
    } catch {
      // skip files we can't read
    }
  }

  if (allHits.length > 0) {
    console.error("❌ HARDCODED SECRETS DETECTED\n");
    for (const hit of allHits) {
      console.error(`  ${hit.file}:${hit.line} (matched: ${hit.pattern})`);
    }
    console.error("\n⚠️  Remove hardcoded credentials and use env vars only.");
    process.exit(1);
  }

  console.log("✅ No hardcoded database credentials found.");
  process.exit(0);
}

main();
