/**
 * 创建 media_reference_counts 视图
 * Prisma 不直接管理 PostgreSQL 视图，需要手动创建。
 * 运行: npx tsx scripts/create-media-view.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE VIEW media_reference_counts AS
    SELECT media_id, COUNT(*) AS ref_count
    FROM media_references
    GROUP BY media_id;
  `);
  console.log("✅ media_reference_counts 视图已创建");

  // 验证
  const result = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(`
    SELECT table_name FROM information_schema.views WHERE table_name = 'media_reference_counts';
  `);
  console.log("验证结果:", result);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
