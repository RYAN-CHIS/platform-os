import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { brandDb } from "@/lib/brand-db-adapter";
import { resolveSingleAdminIdentity } from "@/lib/admin-identity";
import { logAction } from "@/lib/audit-log";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await resolveSingleAdminIdentity(
          () => brandDb.adminUser.findMany({
            where: { email: credentials.email },
            take: 2,
          }),
          () => logAction(
            "system",
            "ADMIN_AUTH_DUPLICATE_IDENTITY",
            "AdminUser",
            undefined,
            "DENIED",
          ),
        );

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  // NEXTAUTH_URL 在 Vercel 环境可自动检测，本地开发使用 env
  ...(process.env.NEXTAUTH_URL && { url: process.env.NEXTAUTH_URL }),
};
