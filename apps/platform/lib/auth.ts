/**
 * Platform OS — Auth Configuration
 * WO-P6B: Shared auth options for Platform server actions.
 */
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createPrisma } from "@yunwu/db";
import bcrypt from "bcryptjs";

const prisma = createPrisma();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: { email: { label: "邮箱", type: "email" }, password: { label: "密码", type: "password" } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await (prisma as any).user.findUnique({ where: { email: credentials.email }, include: { userPermissions: { include: { permission: true } } } });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        const permissions = (user.userPermissions || []).filter((up: any) => up.type === "GRANT").map((up: any) => up.permission.code);
        return { id: String(user.id), email: user.email, name: user.name || user.email, role: user.role, permissions, image: user.avatar };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) { if (user) { token.role = (user as any).role; token.permissions = (user as any).permissions; } return token; },
    async session({ session, token }) { if (session.user) { (session.user as any).role = token.role; (session.user as any).permissions = token.permissions; } return session; },
  },
  pages: { signIn: "/platform/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
