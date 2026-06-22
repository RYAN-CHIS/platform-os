// ═══════════════════════════════════════════════════════════
// @yunwu/auth — Platform Identity v2: Verify
//
// 验证签名，检查过期，强制系统隔离。
// ═══════════════════════════════════════════════════════════

import { createHmac, timingSafeEqual } from "crypto";
import type { IdentityPayload } from "./sign-identity";

export interface VerifyResult {
  valid: boolean;
  user?: IdentityPayload;
  error?: string;
}

/**
 * Verify a signed platform identity token.
 * Returns the decoded payload if valid, null if invalid.
 */
export function verifyIdentity(
  token: string,
  secret: string,
): IdentityPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [base, signature] = parts;

    // Verify signature
    const expected = createHmac("sha256", secret).update(base).digest("hex");
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");

    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;

    // Decode payload
    const payload: IdentityPayload = JSON.parse(
      Buffer.from(base, "base64url").toString(),
    );

    // Check expiration
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Verify identity AND enforce system isolation.
 * Only accepts tokens where aud matches the expected system.
 */
export function verifySystemIdentity(
  token: string,
  secret: string,
  expectedSystem: "erp" | "web" | "brand",
): IdentityPayload | null {
  const user = verifyIdentity(token, secret);
  if (!user) return null;

  // System isolation: token aud must match expected system
  if (user.aud !== expectedSystem && user.aud !== "platform") {
    return null;
  }

  return user;
}

/**
 * Full verification with detailed result
 */
export function verifyIdentityResult(
  token: string,
  secret: string,
  expectedSystem?: "erp" | "web" | "brand",
): VerifyResult {
  if (!token) {
    return { valid: false, error: "Missing identity token" };
  }

  const user = expectedSystem
    ? verifySystemIdentity(token, secret, expectedSystem)
    : verifyIdentity(token, secret);

  if (!user) {
    return { valid: false, error: "Invalid or expired identity" };
  }

  if (user.exp && Date.now() > user.exp) {
    return { valid: false, error: "Identity expired" };
  }

  return { valid: true, user };
}
