// ═══════════════════════════════════════════════════════════
// @yunwu/auth — Platform Identity v2: Sign
//
// 将用户上下文签名为防篡改 token。
// 格式: base64(payload).hex(hmac-sha256)
// ═══════════════════════════════════════════════════════════

import { createHmac } from "crypto";

export interface IdentityPayload {
  id: string;
  email: string;
  role: string;
  system: "erp" | "web" | "brand";
  permissions: string[];
  iat: number;
  exp: number;
  aud: "erp" | "web" | "brand" | "platform";
}

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Generate a signed platform identity token
 */
export function signIdentity(
  user: {
    id: string;
    email: string;
    role: string;
    system: "erp" | "web" | "brand";
    permissions?: string[];
  },
  secret: string,
  ttl?: number,
): string {
  const now = Date.now();
  const payload: IdentityPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    system: user.system,
    permissions: user.permissions ?? [],
    iat: now,
    exp: now + (ttl ?? DEFAULT_TTL),
    aud: user.system,
  };

  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(base).digest("hex");

  return `${base}.${signature}`;
}

/**
 * Generate from NextAuth token (used in middleware)
 */
export function signFromToken(
  token: {
    sub?: string;
    email?: string;
    role?: string;
    permissions?: string[];
  },
  system: "erp" | "web" | "brand",
  secret: string,
): string {
  return signIdentity(
    {
      id: token.sub ?? "unknown",
      email: token.email ?? "",
      role: token.role ?? "viewer",
      system,
      permissions: token.permissions ?? [],
    },
    secret,
  );
}
