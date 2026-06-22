import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 10);

  const existing = await prisma.user.findUnique({
    where: { email: "admin@yunwu.com" },
  });

  if (existing) {
    console.log("管理员账号已存在，跳过创建");
    return;
  }

  await prisma.user.create({
    data: {
      email: "admin@yunwu.com",
      password,
      role: "admin",
      name: "Admin",
    },
  });

  console.log("✅ 管理员账号创建成功");
  console.log("   邮箱: admin@yunwu.com");
  console.log("   密码: admin123");
}

main()
  .catch((e) => {
    console.error("❌ 创建管理员失败:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
