# Vercel Environment Report — WO-Deploy Step 3

## Required Variables

| Variable | Status | Notes |
| --- | --- | --- |
| `DATABASE_URL` | ⚠️ Not set | Need ERP DB (Neon US-East) credentials |
| `NEXTAUTH_SECRET` | ⚠️ Not set | Generate: `openssl rand -hex 32` |
| `NEXTAUTH_URL` | ⚠️ Not set | `https://platform-os-eosin.vercel.app` |
| `ERP_USE_SERVICE_LAYER` | ⚠️ Not set | Set to `true` for production |
| `NODE_ENV` | ✅ Auto | Set by Vercel |

## Action

Set in Vercel Dashboard → Settings → Environment Variables → Production
