# PUBLISH_STATUS After Audit

- Database: `neondb`
- Table: `public.products`
- Role: `brand_app`
- publish_status type: `PublishStatus`

## Updated Rows

| SKU | status before | publish_status before | status after | publish_status after | Result |
|---|---|---|---|---|---|
| YW-B-001 | PUBLISHED | DRAFT | PUBLISHED | PUBLISHED | OK |
| YW-B-002 | PUBLISHED | DRAFT | PUBLISHED | PUBLISHED | OK |
| YW-I-001 | PUBLISHED | DRAFT | PUBLISHED | PUBLISHED | OK |
| YW-S-001 | PUBLISHED | DRAFT | PUBLISHED | PUBLISHED | OK |
| YW-C-001 | PUBLISHED | DRAFT | PUBLISHED | PUBLISHED | OK |

## Transaction Result

- UPDATE affected rows: `5`
- COMMIT: yes
- conflict_count: `0`
- total products: `5`

## Post-Update Stats

| status | publish_status | count |
|---|---|---:|
| PUBLISHED | PUBLISHED | 5 |

## Frontend Regression

| URL | HTTP | Product shown | Runtime Error | Result |
|---|---:|---|---|---|
| https://www.yunwuorigin.com/ | 200 | yes | none observed in curl | OK |
| https://www.yunwuorigin.com/products | 200 | yes | none observed in curl | OK |
| https://www.yunwuorigin.com/products/chujian-baishuijing | 200 | yes | none observed in curl | OK |
| https://www.yunwuorigin.com/products/qichi-yueguangshi | 200 | yes | none observed in curl | OK |
| https://www.yunwuorigin.com/products/jiming-chenxiang | 200 | yes | none observed in curl | OK |
| https://www.yunwuorigin.com/products/cangming-qingtianshi | 200 | yes | none observed in curl | OK |
| https://www.yunwuorigin.com/products/guanfu-qingci | 200 | yes | none observed in curl | OK |

## Notes

- No code, schema, or storefront changes were made.
- `updated_at` values remained unchanged during this direct SQL update, indicating no automatic timestamp trigger was observed for this operation.
