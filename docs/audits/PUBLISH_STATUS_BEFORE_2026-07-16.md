# PUBLISH_STATUS Before Audit

- Database: `neondb`
- Table: `public.products`
- Role: `brand_app`
- publish_status type: `PublishStatus`
- Valid enum values: `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `PUBLISHED`, `UNPUBLISHED`, `ARCHIVED`

## Target Rows

| SKU | Slug | Name | status | publish_status | updated_at |
|---|---|---|---|---|---|
| YW-B-001 | chujian-baishuijing | 初见·白水晶珠串 | PUBLISHED | DRAFT | 2026-06-24 02:34:33.578 |
| YW-B-002 | qichi-yueguangshi | 栖迟·月光石珠串 | PUBLISHED | DRAFT | 2026-06-20 13:50:26.542 |
| YW-I-001 | jiming-chenxiang | 既明·沉香线香 | PUBLISHED | DRAFT | 2026-06-20 15:15:43.879 |
| YW-S-001 | cangming-qingtianshi | 沧溟·青田石印章 | PUBLISHED | DRAFT | 2026-06-20 15:15:44.303 |
| YW-C-001 | guanfu-qingci | 观复·青瓷杯 | PUBLISHED | DRAFT | 2026-06-20 15:15:44.707 |

## Pre-Update Stats

| status | publish_status | count |
|---|---|---:|
| PUBLISHED | DRAFT | 5 |

## Notes

- All five target rows currently have `status='PUBLISHED'` and `publish_status='DRAFT'`.
- No other rows are included in the target set.
