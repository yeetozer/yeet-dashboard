# Yeet Dashboard

Yeet Dashboard now uses a local Express proxy so Dokploy and Cloudflare credentials never reach the browser.

## What changed

- Browser calls now go to same-origin `/api/...` endpoints
- Dokploy and Cloudflare tokens live only in the proxy process
- `env.js` is gone and should not be recreated
- The proxy also serves the static dashboard files

## Proxy endpoints

- `GET /api/dokploy/projects`
- `GET /api/cloudflare/dns`
- `GET /api/cloudflare/zones`
- `GET /api/health`

## Required environment variables

Use `env.example.js` as a sample env file format.

- `PORT` - proxy port, defaults to `8080`
- `DOKPLOY_URL`
- `DOKPLOY_API_KEY`
- `CLOUDFLARE_TOKEN`
- `CLOUDFLARE_ZONE_ID`

## Run locally

```bash
cd proxy
npm install
export PORT=8080
export DOKPLOY_URL="http://46.225.90.5:3000"
export DOKPLOY_API_KEY="your-dokploy-api-key"
export CLOUDFLARE_TOKEN="your-cloudflare-token"
export CLOUDFLARE_ZONE_ID="your-cloudflare-zone-id"
npm start
```

Then open <http://localhost:8080>.

## Development notes

- Start the dashboard through the proxy, not from a raw static file server
- Weather still fetches from `wttr.in` directly and is allowed by CSP
- Missing proxy env vars return API errors without exposing secrets
- Upstream requests time out after 10 seconds

## Verification

```bash
cd proxy
npm install
npm run check
```
