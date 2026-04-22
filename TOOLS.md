# TOOLS.md - Service Configuration Reference

## 🚀 Dokploy

**URL:** http://46.225.90.5:3000
**API Key:** See environment variables below

### Projects (6 total)
| # | Name | Apps | Databases | Status |
|---|------|------|-----------|--------|
| 1 | Yeets-Map | 1 | 1 PostgreSQL | ✅ Active |
| 2 | zonanatura | 0 | 0 | Empty |
| 3 | yigitsolutions | 0 | 0 | Empty |
| 4 | Garmentic-Website | 0 | 0 | Empty |
| 5 | BoulderJungle-System | 1 | 1 | ✅ Active |
| 6 | Fadeolog | 2 | 1 | ✅ Active |

### API Usage
```bash
curl -X GET \
  'http://46.225.90.5:3000/api/project.all' \
  -H 'accept: application/json' \
  -H "x-api-key: $DOKPLOY_API_KEY"
```

---

## ☁️ Cloudflare

**Zone:** yigitsolutions.com
**Zone ID:** See environment variables below
**API Token:** See environment variables below

### DNS Records (16 total)
| Type | Name | Value | Proxied |
|------|------|-------|---------|
| A | yeetsmap.yigitsolutions.com | 46.225.90.5 | ✅ |
| A | fadeolog.yigitsolutions.com | 46.225.90.5 | ❌ |
| A | api.fadeolog.yigitsolutions.com | 46.225.90.5 | ❌ |
| A | boulderjungle.yigitsolutions.com | 46.225.90.5 | ❌ |
| A | www.yigitsolutions.com | 46.225.90.5 | ❌ |
| MX | yigitsolutions.com | mx01.mail.icloud.com | - |
| MX | yigitsolutions.com | mx02.mail.icloud.com | - |
| TXT | yigitsolutions.com | v=spf1 include:icloud.com ~all | - |

### API Usage
```bash
curl -X GET \
  'https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records' \
  -H "Authorization: Bearer $CLOUDFLARE_TOKEN"
```

---

## 🔧 Environment Variables

Set these before running the dashboard:

```bash
export DOKPLOY_API_KEY="your-dokploy-api-key"
export CLOUDFLARE_TOKEN="your-cloudflare-token"
export CLOUDFLARE_ZONE_ID="your-zone-id"
```

**Where to get them:**
- **Dokploy API Key:** Dashboard → Settings → Profile → API/CLI Section
- **Cloudflare Token:** https://dash.cloudflare.com/profile/api-tokens
- **Zone ID:** Cloudflare Dashboard → Overview → API section

---

## 📝 Notes

- Tokens are NOT stored in this repo (GitHub push protection)
- Use environment variables or git config locally
- GitHub repo: https://github.com/yeetozer/yeet-dashboard
- Dashboard URL: http://localhost:8080/mission-control/

---

*Last updated: 2026-04-22*