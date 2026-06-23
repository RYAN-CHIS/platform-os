// Reset password using @yunwu/db (authoritative schema)
import { createPrisma } from '@yunwu/db';
import bcrypt from 'bcryptjs';

const prisma = createPrisma();

const email = process.argv[2] || 'admin@yunwu.com';
const newPassword = process.argv[3] || 'admin123';

async function main() {
  const hash = await bcrypt.hash(newPassword, 10);

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { password: hash },
    });
    console.log(`✅ Password reset for: ${user.email}`);
    console.log(`   New password: ${newPassword}`);
  } catch (e: any) {
    if (e.code === 'P2025') {
      console.log(`❌ User not found: ${email}`);
      console.log('Creating user...');
      const user = await prisma.user.create({
        data: {
          email,
          name: 'Admin',
          password: hash,
          role: 'SUPER_ADMIN',
          systems: ['ERP'],
        },
      });
      console.log(`✅ User created: ${user.email}`);
    } else {
      throw e;
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
