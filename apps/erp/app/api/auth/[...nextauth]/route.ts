import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { computeEffectivePermissions, normalizeRole, Role, ALL_PERMISSION_CODES } from "@/lib/permissions";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "邮箱", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) return null;

        // V3: 计算有效权限
        let permissionCodes: string[];
        const userRole = normalizeRole(user.role);

        if (userRole === Role.ADMIN) {
          permissionCodes = ALL_PERMISSION_CODES;
        } else {
          permissionCodes = await computeEffectivePermissions(user.id, user.role);
        }

        // V3: 单独加载临时权限列表（含过期时间，供 middleware 实时检测）
        let tempPermissions: { code: string; expiresAt: string }[] = [];
        try {
          const now = new Date();
          const temps = await prisma.temporaryPermission.findMany({
            where: {
              userId: user.id,
              expiresAt: { gt: now },
            },
            include: { permission: true },
          });
          tempPermissions = temps.map((t) => ({
            code: t.permission.code,
            expiresAt: t.expiresAt.toISOString(),
          }));
        } catch {
          // 降级：不加载临时权限
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          permissions: permissionCodes,
          tempPermissions,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.avatar = (user as any).avatar;
        // V3: 分离存储基础权限和临时权限（含过期时间）
        token.permissions = (user as any).permissions || [];
        token.tempPermissions = (user as any).tempPermissions || [];
      }
      // 支持客户端通过 session update 刷新权限
      if (trigger === "update" && session?.permissions) {
        token.permissions = session.permissions;
        if (session.tempPermissions) {
          token.tempPermissions = session.tempPermissions;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).avatar = token.avatar;
        (session.user as any).permissions = token.permissions || [];
        (session.user as any).tempPermissions = token.tempPermissions || [];
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
