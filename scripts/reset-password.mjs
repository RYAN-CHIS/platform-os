import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
  const email = process.argv[2] || 'admin@yunwu.com';
  const newPassword = process.argv[3] || 'admin123';

  const hash = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.update({
    where: { email },
    data: { password: hash },
  });

  console.log(`✅ Password reset for ${user.email}`);
  console.log(`   New password: ${newPassword}`);
  await prisma.$disconnect();
}

resetPassword().catch(async (e) => {
  console.error('❌ Error:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
