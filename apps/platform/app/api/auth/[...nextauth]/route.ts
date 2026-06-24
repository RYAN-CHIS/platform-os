/**
 * Platform OS — NextAuth Configuration
 *
 * Shares the same NextAuth secret as ERP/Brand OS.
 * Uses credential-based auth (same DB, same user table).
 * After login, session includes role + permissions for sidebar filtering.
 */

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createPrisma } from "@yunwu/db";
import bcrypt from "bcryptjs";
import { createAuthAudit } from "@/lib/audit";

const prisma = createPrisma();

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await (prisma as any).user.findUnique({
          where: { email: credentials.email },
          include: {
            userPermissions: {
              include: { permission: true },
            },
          },
        });

        if (!user) {
          try { await createAuthAudit({ action: "LOGIN_FAILED", email: credentials?.email as string, reason: "user_not_found" }); } catch {}
          return null;
        }

        // Block deleted/disabled/inactive/suspended users
        const blockedStatuses = ["deleted", "disabled", "inactive", "suspended"];
        const userStatus = (user.status || "active").toLowerCase();
        if (blockedStatuses.includes(userStatus)) {
          try { await createAuthAudit({ action: "LOGIN_FAILED", email: credentials?.email as string, userId: user.id, reason: `user_${userStatus}` }); } catch {}
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          try { await createAuthAudit({ action: "LOGIN_FAILED", email: credentials?.email as string, userId: user.id, reason: "wrong_password" }); } catch {}
          return null;
        }

        // Audit: LOGIN_SUCCESS
        try {
          await (prisma as any).$executeRawUnsafe(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, user.id);
          await createAuthAudit({ action: "LOGIN_SUCCESS", email: credentials.email as string, userId: user.id });
        } catch {}

        // Build permissions array from userPermissions
        const permissions = user.userPermissions
          .filter((up: any) => up.type === "GRANT")
          .map((up: any) => up.permission.code);

        return {
          id: String(user.id),
          email: user.email,
          name: user.name || user.email,
          role: user.role,
          permissions,
          image: user.avatar,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions;
      }
      return session;
    },
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
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
