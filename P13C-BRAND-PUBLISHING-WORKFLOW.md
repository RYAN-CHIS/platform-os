# P13C — Brand Publishing Workflow Engine

**状态**: ✅ **PASS** (26/26 检查项通过)

**完成时间**: 2026-06-24

---

## 一、已接入模块

| 模块 | ContentType | Brand DB 表 | 状态 |
|------|-------------|-------------|------|
| Products | `products` | `products` | ✅ 完整接入 |
| Series | `series` | `series` | ✅ 完整接入 |
| Journal | `journal` | `journal_posts` | ✅ 完整接入 |
| Home | `home` | `page_contents` | ✅ 完整接入 |

---

## 二、状态机实现

### 统一状态枚举

```typescript
type PublishState = 
  | 'DRAFT'        // 草稿
  | 'IN_REVIEW'    // 审核中
  | 'APPROVED'     // 已批准
  | 'SCHEDULED'    // 已排期
  | 'PUBLISHED'    // 已发布
  | 'ARCHIVED'     // 已归档
  | 'REJECTED';    // 已驳回
```

### 状态流转规则

```
DRAFT → IN_REVIEW → APPROVED → SCHEDULED → PUBLISHED → ARCHIVED
  ↓         ↓          ↓           ↓           ↓
  └──────→ REJECTED ←─┘           └──────────→ (unpublish → DRAFT)
```

### 验证结果

- ✅ 所有 4 模块状态流转正确
- ✅ 禁止的流转被拒绝
- ✅ 允许的流转执行成功

---

## 三、数据库结构

### 新增表

#### `content_versions`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `content_type` | VARCHAR(50) | 内容类型 (products/series/journal/home) |
| `content_id` | VARCHAR(100) | 关联内容 ID |
| `version` | INT | 版本号 (自增) |
| `snapshot` | JSONB | 完整内容快照 |
| `status` | VARCHAR(20) | 保存时的状态 |
| `created_by` | INT | 操作人 ID |
| `created_at` | TIMESTAMPTZ | 创建时间 |

**作用**: 每次发布自动保存完整快照，支持版本历史查看和回滚

#### `publish_jobs`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `content_type` | VARCHAR(50) | 内容类型 |
| `content_id` | VARCHAR(100) | 关联内容 ID |
| `publish_at` | TIMESTAMPTZ | 计划发布时间 |
| `status` | VARCHAR(20) | pending/published/failed/cancelled |
| `created_by` | INT | 创建人 ID |
| `created_at` | TIMESTAMPTZ | 创建时间 |

**作用**: 定时发布队列，由 `processPublishJobs()` 处理

### 现有表新增字段

#### `products`

- `status` VARCHAR(20) DEFAULT 'DRAFT'
- `published_at` TIMESTAMPTZ

#### `series`

- `status` VARCHAR(20) DEFAULT 'DRAFT'
- `published_at` TIMESTAMPTZ

#### `journal_posts`

- 扩展 `PublishStatus` enum: IN_REVIEW, APPROVED, SCHEDULED, ARCHIVED, REJECTED
- `published_at` TIMESTAMPTZ

#### `page_contents`

- `status` VARCHAR(20) DEFAULT 'DRAFT'
- `published_at` TIMESTAMPTZ

---

## 四、版本系统

### 实现功能

| 功能 | 实现 | 状态 |
|------|------|------|
| 发布时自动保存快照 | `saveVersion()` | ✅ |
| 查看历史版本 | `getVersions()` | ✅ |
| 版本列表 UI | History Modal | ✅ |
| 回滚到指定版本 | `rollbackToVersion()` | ✅ |
| 差异比对 | JSON diff | ✅ |

### 验证结果

```
✅ content_versions 表存在
✅ 版本保存正确
✅ 版本号递增正确
✅ 版本查询正确
✅ 版本快照完整性
```

---

## 五、Preview 系统

### 预览路由

| 路由 | 说明 |
|------|------|
| `/preview/products/[id]?token=xxx` | 产品预览 |
| `/preview/series/[id]?token=xxx` | 系列预览 |
| `/preview/journal/[id]?token=xxx` | 文章预览 |

### Token 机制

- 生成: `generatePreviewToken(contentType, contentId)` → 返回加密 token
- 校验: `validatePreviewToken(token)` → 返回 `{ valid, contentType, contentId }`
- 有效期: 24 小时
- 单次使用后失效

### 验证结果

```
✅ Preview token 生成
✅ Token 校验
✅ 内容读取
✅ 预览页面渲染
```

---

## 六、定时发布

### 实现机制

1. **创建定时任务**: `schedulePublish(contentType, contentId, publishAt)` → 写入 `publish_jobs`
2. **处理任务**: `processPublishJobs()` → 扫描到期的任务，执行发布
3. **状态流转**: SCHEDULED → PUBLISHED

### 验证结果

```
✅ publish_jobs 表存在
✅ 定时任务创建
✅ 任务状态正确
```

---

## 七、SEO Snapshot

### 实现

```typescript
createSeoSnapshot(contentType, contentId, {
  title: string;
  slug: string;
  description: string;
  keywords: string;
  ogImage?: string;
  canonicalUrl?: string;
  publishedAt: string;
})
```

### 保存位置

`content_versions` 表的 `snapshot` 字段中包含 SEO 数据

### 验证结果

```
✅ SEO 字段保存
✅ 发布时自动记录
```

---

## 八、前端 UI 增强

### Products 页面

- ✅ 状态徽章 (DRAFT=gray, IN_REVIEW=amber, APPROVED=blue, SCHEDULED=purple, PUBLISHED=green, ARCHIVED=darkgray, REJECTED=red)
- ✅ 工作流按钮 (提交审核、通过、驳回、立即发布、定时发布、下架、归档、预览)
- ✅ 版本历史 Modal
- ✅ 回滚功能
- ✅ 定时发布对话框

### Series 页面

- ✅ 状态徽章
- ✅ 工作流按钮
- ✅ 版本历史
- ✅ 回滚功能

### Journal 页面

- ✅ 状态徽章
- ✅ 工作流按钮
- ✅ SEO 字段编辑
- ✅ 版本历史
- ✅ 回滚功能

### Home 页面

- ✅ 页面内容 CRUD
- ✅ 工作流按钮
- ✅ 版本历史
- ✅ 站点设置编辑

---

## 九、浏览器验收

### 页面渲染检查

| 页面 | HTTP 状态 | 内容大小 |
|------|-----------|----------|
| `/brand/products` | 200 | ~150KB |
| `/brand/series` | 200 | ~80KB |
| `/brand/journal` | 200 | ~100KB |
| `/brand/home` | 200 | ~120KB |
| `/preview/products/1` | 200 | 预览页面 |
| `/preview/series/1` | 200 | 预览页面 |
| `/preview/journal/test` | 200 | 预览页面 |

### 功能检查

```
✅ 创建草稿
✅ 编辑内容
✅ 提交审核
✅ 审批通过
✅ 审批驳回
✅ 立即发布
✅ 定时发布
✅ 下架内容
✅ 归档内容
✅ 版本历史查看
✅ 版本回滚
✅ 预览链接生成
```

---

## 十、审计接入

### 审计动作

| 动作 | 模块 | 状态 |
|------|------|------|
| SUBMIT_REVIEW | 全部 | ✅ |
| APPROVE | 全部 | ✅ |
| REJECT | 全部 | ✅ |
| PUBLISH | 全部 | ✅ |
| UNPUBLISH | 全部 | ✅ |
| SCHEDULE_PUBLISH | 全部 | ✅ |
| AUTO_PUBLISH | 全部 | ✅ |
| ROLLBACK | 全部 | ✅ |
| PREVIEW_CREATE | 全部 | ✅ |
| SEO_UPDATE | Journal | ✅ |

### 审计字段

- `before`: 修改前完整对象
- `after`: 修改后完整对象
- `diff`: 差异字段
- `version`: 版本号 (如有)

---

## 十一、前台联动验证

### 前台网站

- **URL**: www.yunwuorigin.com
- **DB**: 与 Brand OS 共享同一 Brand DB
- **读取方式**: 直接查询 Brand DB 的 `products`, `series`, `journal_posts` 表

### 联动机制

1. Brand OS 发布内容 → 更新 Brand DB 的 `status='PUBLISHED'`, `published_at=NOW()`
2. 前台网站读取 `WHERE status='PUBLISHED'` 的内容
3. 内容立即在前台可见

### 验证方式

- ✅ 数据库查询确认状态变更
- ✅ `published_at` 字段更新
- ✅ 前台查询条件匹配

---

## 十二、验证检查清单 (26/26)

### 数据库层 (9/9)

- ✅ content_versions 表存在
- ✅ publish_jobs 表存在
- ✅ products.status 字段存在
- ✅ products.published_at 字段存在
- ✅ series.status 字段存在
- ✅ series.published_at 字段存在
- ✅ journal_posts.status 字段扩展
- ✅ page_contents.status 字段存在
- ✅ 数据迁移完成

### 功能层 (12/12)

- ✅ 状态机引擎工作
- ✅ 版本保存正确
- ✅ 版本号递增正确
- ✅ 版本查询正确
- ✅ 版本快照完整性
- ✅ Preview token 生成
- ✅ Token 校验
- ✅ 内容读取
- ✅ 定时任务创建
- ✅ 任务状态正确
- ✅ SEO 字段保存
- ✅ 审计日志写入

### 前端层 (5/5)

- ✅ Products 页面渲染
- ✅ Series 页面渲染
- ✅ Journal 页面渲染
- ✅ Home 页面渲染
- ✅ Preview 页面渲染

---

## 十三、代码文件清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `apps/platform/lib/publisher.ts` | 统一出版引擎 |
| `apps/platform/app/preview/products/[id]/page.tsx` | 产品预览页 |
| `apps/platform/app/preview/series/[id]/page.tsx` | 系列预览页 |
| `apps/platform/app/preview/journal/[id]/page.tsx` | 文章预览页 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `packages/db/schema.prisma` | 新增 PublishState enum, ContentVersion, PublishJob 模型 |
| `apps/platform/modules/brand/products/actions.ts` | 新增工作流函数 |
| `apps/platform/modules/brand/series/actions.ts` | 新增工作流函数 |
| `apps/platform/modules/brand/journal/actions.ts` | 新增工作流函数 |
| `apps/platform/modules/brand/home/actions.ts` | 新增 CRUD + 工作流函数 |
| `apps/platform/app/(platform)/brand/products/client.tsx` | UI 增强 |
| `apps/platform/app/(platform)/brand/series/client.tsx` | UI 增强 |
| `apps/platform/app/(platform)/brand/journal/client.tsx` | UI 增强 |
| `apps/platform/app/(platform)/brand/home/client.tsx` | 新增完整编辑功能 |

---

## 十四、剩余未完成项

**无** — 所有功能已完整实现并验证通过。

---

## 最终状态

```
P13C Brand Publishing: ✅ PASS (26/26)
```

---

## 附录：工作流操作指南

### 提交审核

```typescript
await submitProductForReview(productId);
// 状态: DRAFT → IN_REVIEW
```

### 审批通过

```typescript
await approveProduct(productId);
// 状态: IN_REVIEW → APPROVED
```

### 立即发布

```typescript
await publishProductNow(productId);
// 状态: APPROVED → PUBLISHED
// 同时: 保存版本快照, 记录 published_at
```

### 定时发布

```typescript
await scheduleProductPublish(productId, '2026-06-25T10:00:00Z');
// 状态: APPROVED → SCHEDULED
// 写入 publish_jobs
```

### 版本回滚

```typescript
await rollbackProduct(productId, 3);
// 恢复到版本 3 的内容
// 创建新版本
```

### 预览

```typescript
const { token } = await getProductPreviewToken(productId);
// 链接: /preview/products/{id}?token={token}
```
