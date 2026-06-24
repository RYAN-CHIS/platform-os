import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@yunwu/db";
import { Prisma } from "@prisma/client";
import type { SessionUser } from "./types";

const BLOCKED_USER_STATUSES = new Set(["deleted", "disabled", "inactive", "suspended"]);

type AuthUserRecord = {
  id: number;
  email: string;
  password: string;
  name: string | null;
  role: string;
  systems: string[] | null;
  status: string;
};

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const userRows = await prisma.$queryRaw<AuthUserRecord[]>(Prisma.sql`
          SELECT id, email, password, name, role::text, systems, COALESCE(status, 'active') AS status
          FROM users
          WHERE lower(email) = lower(${credentials.email})
          LIMIT 1
        `);
        const user = userRows[0] || null;
        if (!user) return null;
        if (BLOCKED_USER_STATUSES.has(user.status)) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        const userPermissions = await prisma.userPermission.findMany({
          where: { userId: user.id, type: "GRANT" },
          include: { permission: true },
        });

        const tempPermissions = await prisma.temporaryPermission.findMany({
          where: { userId: user.id, expiresAt: { gt: new Date() } },
          include: { permission: true },
        });

        const permSet = new Set<string>();
        userPermissions.forEach((up) => permSet.add(up.permission.code));
        tempPermissions.forEach((tp) => permSet.add(tp.permission.code));

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          systems: user.systems || [],
          permissions: Array.from(permSet),
        } as SessionUser & { id: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.systems = (user as any).systems;
        token.permissions = (user as any).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).systems = token.systems;
        (session.user as any).permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
