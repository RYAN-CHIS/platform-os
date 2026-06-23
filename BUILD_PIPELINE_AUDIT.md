# Build Pipeline Audit — WO-Deploy Phase 2

## Platform package.json

```json
{
  "scripts": {
    "dev": "next dev -p 3100",
    "build": "next build",
    "db:generate": "cd ../../packages/db && prisma generate"
  }
}
```

## Required Production Build Steps

```bash
# 1. Generate Prisma client
pnpm db:generate
# Requires: DATABASE_URL env var set

# 2. Build Platform
pnpm build
# Requires: NEXTAUTH_SECRET, NEXTAUTH_URL

# 3. Deploy
vercel deploy --prod
```

## Environment Variables (Production)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | ERP PostgreSQL connection |
| `DIRECT_DATABASE_URL` | Direct PG conn (for migrations) |
| `NEXTAUTH_SECRET` | Session encryption |
| `NEXTAUTH_URL` | `https://app.yunwu.com` |
| `ERP_USE_SERVICE_LAYER` | `true` (activate direct Prisma) |
| `ERP_API_URL` | `http://localhost:3001` (fallback, unused in prod) |

## Vercel Configuration

```json
{
  "buildCommand": "cd ../../packages/db && prisma generate && cd ../../apps/platform && next build",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

## Status: ✅ Ready
