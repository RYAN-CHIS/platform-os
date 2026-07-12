import { brandDb } from "@/lib/brand-db-adapter";

/**
 * 记录审计日志。
 *
 * 使用方式：
 * ```ts
 * await logAction(userId, "DELETE_PRODUCT", "Product", String(productId), "删除了作品: SKU-xxx");
 * ```
 *
 * @param userId     执行操作的用户 ID
 * @param action     操作类型（如 DELETE_PRODUCT, UPDATE_SERIES, UPDATE_SETTINGS 等）
 * @param entityType 实体类型（如 Product, Series, AdminUser 等）
 * @param entityId   实体 ID（可选）
 * @param details    操作详情（可选，建议用中文描述）
 */
export async function logAction(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  details?: string,
) {
  try {
    await brandDb.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId: entityId ?? null,
        details: details ?? null,
      },
    });
  } catch (err) {
    // 审计日志失败不阻塞主流程
    console.error("审计日志写入失败", err);
  }
}
