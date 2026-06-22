/**
 * Brand OS V2 — 媒体引用服务
 *
 * 统一管理 media_references 桥表，替代手动计数器。
 * 创建/更新实体时调用 link()，删除前调用 unlink()。
 * 引用计数通过 PostgreSQL 视图 media_reference_counts 获取，始终准确。
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface MediaRefEntity {
  type: string;   // entity_type: 'product' | 'series' | 'article' | 'page' | 'banner' | 'seo_config'
  id: number;     // entity_id
  field?: string; // field_name: 若指定则只清除该字段的引用；不指定则清除实体的全部引用
}

export interface MediaRefRow {
  entity_type: string;
  entity_id: number;
  field_name: string;
}

export const MediaReferenceService = {
  /**
   * 建立引用（创建/更新实体时调用）
   * 通过 media URL 反查 media_assets 记录，写入桥表。
   * 若 URL 不在 media_assets 中（如外部图片），安全跳过。
   */
  async link(
    mediaUrl: string | null | undefined,
    entity: MediaRefEntity,
  ): Promise<void> {
    if (!mediaUrl) return;

    try {
      const media = await prisma.mediaAsset.findFirst({
        where: { url: mediaUrl },
        select: { id: true },
      });
      if (!media) return; // 安全跳过

      await prisma.$executeRaw`
        INSERT INTO media_references (media_id, entity_type, entity_id, field_name)
        VALUES (${media.id}, ${entity.type}, ${entity.id}, ${entity.field ?? "default"})
        ON CONFLICT (media_id, entity_type, entity_id, field_name) DO NOTHING
      `;
    } catch (error) {
      console.error("[MediaRef] link 失败:", error);
    }
  },

  /**
   * 批量建立引用
   */
  async linkMany(
    urls: (string | null | undefined)[],
    entity: MediaRefEntity,
  ): Promise<void> {
    const validUrls = urls.filter(Boolean) as string[];
    await Promise.all(validUrls.map((url) => this.link(url, entity)));
  },

  /**
   * 清除引用（更新 entity 前调用，先清除再重新 link）
   */
  async unlink(entity: MediaRefEntity): Promise<void> {
    try {
      if (entity.field) {
        await prisma.$executeRaw`
          DELETE FROM media_references
          WHERE entity_type = ${entity.type}
            AND entity_id = ${entity.id}
            AND field_name = ${entity.field}
        `;
      } else {
        await prisma.$executeRaw`
          DELETE FROM media_references
          WHERE entity_type = ${entity.type}
            AND entity_id = ${entity.id}
        `;
      }
    } catch (error) {
      console.error("[MediaRef] unlink 失败:", error);
    }
  },

  /**
   * 更新实体引用（先 unlink 再 link，保证引用与当前字段值一致）
   */
  async sync(
    mediaUrl: string | null | undefined,
    entity: MediaRefEntity,
  ): Promise<void> {
    await this.unlink(entity);
    await this.link(mediaUrl, entity);
  },

  /**
   * 查询「谁引用了这张图」（删除前检查）
   */
  async getReferences(mediaId: number): Promise<MediaRefRow[]> {
    try {
      return await prisma.$queryRaw<MediaRefRow[]>`
        SELECT entity_type, entity_id, field_name
        FROM media_references
        WHERE media_id = ${mediaId}
        ORDER BY entity_type, entity_id
      `;
    } catch {
      return [];
    }
  },

  /**
   * 获取引用计数（从视图读取，始终准确）
   */
  async getReferenceCount(mediaId: number): Promise<number> {
    try {
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COALESCE(ref_count, 0) AS count
        FROM media_reference_counts
        WHERE media_id = ${mediaId}
      `;
      return Number(result[0]?.count ?? 0);
    } catch {
      return 0;
    }
  },

  /**
   * 批量获取引用计数
   */
  async getReferenceCounts(
    mediaIds: number[],
  ): Promise<Map<number, number>> {
    if (mediaIds.length === 0) return new Map();
    try {
      const rows = await prisma.$queryRaw<Array<{ media_id: number; ref_count: bigint }>>`
        SELECT media_id, ref_count
        FROM media_reference_counts
        WHERE media_id = ANY(${mediaIds})
      `;
      const map = new Map<number, number>();
      for (const row of rows) {
        map.set(row.media_id, Number(row.ref_count));
      }
      // 补全无引用记录的 media
      for (const id of mediaIds) {
        if (!map.has(id)) map.set(id, 0);
      }
      return map;
    } catch {
      return new Map(mediaIds.map((id) => [id, 0]));
    }
  },
};
