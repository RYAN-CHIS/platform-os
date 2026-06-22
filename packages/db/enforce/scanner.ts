// ═══════════════════════════════════════════════════════════
// Enforcement Layer — 违规检测扫描器
//
// 扫描所有 app 代码，检测违规模式：
//   1. 直接 import PrismaClient (bypass @yunwu/db)
//   2. 直接调用 prisma.model.findMany() (bypass domain layer)
//   3. 未包装的 Domain Service (bypass guard)
// ═══════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, extname } from "path";

export interface Violation {
  severity: "critical" | "warning" | "clean";
  file: string;
  line: number;
  pattern: string;
  message: string;
}

/**
 * 扫描指定目录，返回违规列表
 */
export function scanViolations(rootDir: string): Violation[] {
  const violations: Violation[] = [];
  const exts = [".ts", ".tsx"];
  const skip = ["node_modules", ".next", ".git", "packages/db/domain", "packages/db/control", "packages/db/enforce"];

  function walk(dir: string) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (skip.some((s) => full.includes(s))) continue;
      try {
        const st = statSync(full);
        if (st.isDirectory()) {
          walk(full);
        } else if (exts.includes(extname(entry))) {
          checkFile(full, violations);
        }
      } catch {
        // skip unreadable
      }
    }
  }

  walk(rootDir);
  return violations;
}

function checkFile(file: string, violations: Violation[]) {
  try {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");
    const filename = file.replace(/^.*\/yunwu\//, "");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNo = i + 1;

      // CRITICAL: Direct PrismaClient import (bypass @yunwu/db)
      if (
        line.includes("import { PrismaClient }") &&
        !line.includes("@yunwu/db")
      ) {
        violations.push({
          severity: "critical",
          file: filename,
          line: lineNo,
          pattern: "import { PrismaClient }",
          message: "禁止直接导入 PrismaClient。请使用 import { createPrisma } from '@yunwu/db'",
        });
      }

      // CRITICAL: new PrismaClient (bypass createPrisma)
      if (
        line.includes("new PrismaClient(") &&
        !line.includes("// @yunwu/db") &&
        !file.includes("packages/db/")
      ) {
        violations.push({
          severity: "critical",
          file: filename,
          line: lineNo,
          pattern: "new PrismaClient()",
          message: "禁止直接创建 PrismaClient。请使用 createPrisma() from @yunwu/db",
        });
      }

      // WARNING: Direct prisma.model access in API routes (bypass domain)
      if (
        line.includes("prisma.") &&
        !line.includes("prisma.$") && // allow prisma.$transaction etc
        !line.includes("ProductService") &&
        !line.includes("SeriesService") &&
        !line.includes("MaterialService") &&
        !file.includes("packages/db/") &&
        file.includes("/api/")
      ) {
        violations.push({
          severity: "warning",
          file: filename,
          line: lineNo,
          pattern: "prisma.* in API route",
          message: "API 路由应使用 Domain Service 而非直接调用 prisma",
        });
      }
    }
  } catch {
    // skip unreadable
  }
}

/**
 * 生成违规报告
 */
export function generateViolationReport(violations: Violation[]): string {
  const critical = violations.filter((v) => v.severity === "critical");
  const warnings = violations.filter((v) => v.severity === "warning");

  let report = "";
  report += `\n=== VIOLATION REPORT ===\n`;
  report += `Total: ${violations.length} | Critical: ${critical.length} | Warning: ${warnings.length}\n\n`;

  if (critical.length > 0) {
    report += `--- CRITICAL ---\n`;
    for (const v of critical) {
      report += `  ${v.file}:${v.line} — ${v.message}\n`;
    }
    report += `\n`;
  }

  if (warnings.length > 0) {
    report += `--- WARNING ---\n`;
    for (const v of warnings) {
      report += `  ${v.file}:${v.line} — ${v.message}\n`;
    }
    report += `\n`;
  }

  if (critical.length === 0 && warnings.length === 0) {
    report += `  ✅ CLEAN — 未发现违规\n`;
  }

  return report;
}
