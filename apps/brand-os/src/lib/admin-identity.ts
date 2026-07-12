/**
 * Preserves the database's intentionally non-unique AdminUser.email contract.
 * Authentication fails closed when legacy data contains duplicate identities.
 */
export async function resolveSingleAdminIdentity<T>(
  findUsers: () => Promise<T[]>,
  recordDuplicateIdentity: () => Promise<void>,
): Promise<T | null> {
  try {
    const users = await findUsers();
    if (users.length === 1) return users[0];
    if (users.length > 1) await recordDuplicateIdentity();
    return null;
  } catch {
    return null;
  }
}

export async function assertAdminEmailAvailable(
  findExisting: () => Promise<{ id: string } | null>,
): Promise<void> {
  const existing = await findExisting();
    if (existing) throw new Error("管理员邮箱已存在");
}
