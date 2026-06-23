# Rollback Plan — WO-Deploy Phase 7

## Immediate Rollback

```bash
# If Service Layer fails:
# 1. Remove flag in Vercel Dashboard
ERP_USE_SERVICE_LAYER=false

# 2. Redeploy (or environment change auto-triggers)
# This reverts to: Platform → fetch() → ERP API :3001
```

## Verification

```bash
# Check which path is active:
curl https://app.yunwu.com/platform/erp/materials
# Should return 200 (via fetch fallback if service layer down)
```

## Fallback Chain

```
1. Service Layer (ERP_USE_SERVICE_LAYER=true)
   ↓ fails
2. fetch() to ERP API (ERP_API_URL)
   ↓ fails
3. Error page with retry button
```

## Rollback Scenarios

| Scenario | Action | Downtime |
| --- | --- | --- |
| Service Layer crash | Set `ERP_USE_SERVICE_LAYER=false` | < 1 min |
| DB connection lost | Fix DATABASE_URL + redeploy | < 5 min |
| Build failure | `git revert` + push | < 10 min |
| Full outage | Restore previous Vercel deployment | < 1 min |

## Status: ✅ Rollback ready
