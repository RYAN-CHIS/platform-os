/**
 * Platform OS — Auth Configuration
 * WO-P6B: Shared auth options for Platform server actions.
 */
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createPrisma } from "@yunwu/db";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createAuthAudit } from "@/lib/audit";

const prisma = createPrisma();
const BLOCKED_USER_STATUSES = new Set(["deleted", "disabled", "inactive", "suspended"]);

type AuthUserRecord = {
  id: number;
  email: string;
  password: string;
  name: string | null;
  role: string;
  avatar: string | null;
  status: string;
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: { email: { label: "邮箱", type: "email" }, password: { label: "密码", type: "password" } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const userRows = await prisma.$queryRaw<AuthUserRecord[]>(Prisma.sql`
          SELECT id, email, password, name, role::text, avatar, COALESCE(status, 'active') AS status
          FROM users
          WHERE lower(email) = lower(${credentials.email})
          LIMIT 1
        `);
        const user = userRows[0] || null;
        if (!user) {
          try { await createAuthAudit({ action: "LOGIN_FAILED", email: credentials?.email as string, reason: "user_not_found" }); } catch {}
          return null;
        }
        if (BLOCKED_USER_STATUSES.has(user.status)) {
          try { await createAuthAudit({ action: "LOGIN_FAILED", email: credentials?.email as string, userId: user.id, reason: `user_${user.status}` }); } catch {}
          return null;
        }
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          try { await createAuthAudit({ action: "LOGIN_FAILED", email: credentials?.email as string, userId: user.id, reason: "wrong_password" }); } catch {}
          return null;
        }
        const userPermissions = await prisma.userPermission.findMany({
          where: { userId: user.id, type: "GRANT" },
          include: { permission: true },
        });
        try {
          await prisma.$executeRaw(Prisma.sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`);
          await createAuthAudit({ action: "LOGIN_SUCCESS", email: credentials.email as string, userId: user.id });
        } catch {}
        const permissions = userPermissions.map((up: any) => up.permission.code);
        return { id: String(user.id), email: user.email, name: user.name || user.email, role: user.role, permissions, image: user.avatar };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) { if (user) { token.role = (user as any).role; token.permissions = (user as any).permissions; } return token; },
    async session({ session, token }) { if (session.user) { (session.user as any).role = token.role; (session.user as any).permissions = token.permissions; } return session; },
  },
  events: {
    async signOut({ token }) {
      try {
        const email = token.email as string;
        if (email) {
          await createAuthAudit({ action: "LOGOUT", email, reason: "user_initiated" });
        }
      } catch {}
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
