# Domain Binding Report — WO-Deploy Step 6

## Current

| URL | Status |
| --- | --- |
| `https://platform-i3o3vkfsw-yunwu1.vercel.app` | ✅ Deployed |
| `https://platform-os-eosin.vercel.app` | ✅ Aliased |

## Target

`https://app.yunwu.com` requires:
1. Domain ownership verified in Vercel Dashboard
2. DNS record pointing to Vercel
3. SSL certificate auto-provisioned

## Action

```bash
# Vercel Dashboard → Settings → Domains → Add
app.yunwu.com

# DNS (at your domain registrar):
app.yunwu.com  CNAME  cname.vercel-dns.com
```
