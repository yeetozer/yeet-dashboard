#!/bin/bash
# Yeet Dashboard Startup Script
# 
# IMPORTANT: Set these environment variables before running:
# export DOKPLOY_URL="http://your-dokploy-instance:3000"
# export DOKPLOY_API_KEY="your-dokploy-api-key"
# export CLOUDFLARE_TOKEN="your-cloudflare-token"
# export CLOUDFLARE_ZONE_ID="your-cloudflare-zone-id"

echo "🚀 Starting Yeet Dashboard..."

# Check if required env vars are set
if [ -z "$DOKPLOY_URL" ] || [ -z "$DOKPLOY_API_KEY" ]; then
  echo "⚠️  Warning: DOKPLOY_URL or DOKPLOY_API_KEY not set"
  echo "Set them before running this script"
fi

if [ -z "$CLOUDFLARE_TOKEN" ] || [ -z "$CLOUDFLARE_ZONE_ID" ]; then
  echo "⚠️  Warning: CLOUDFLARE_TOKEN or CLOUDFLARE_ZONE_ID not set"
  echo "Set them before running this script"
fi

# Kill existing processes on port 8080
fuser -k 8080/tcp 2>/dev/null

# Start proxy server
echo "📡 Starting proxy server..."
cd "$(dirname "$0")/proxy" && nohup node server.js > /tmp/proxy.log 2>&1 &
echo "Proxy PID: $!"

# Start frontend server
echo "🌐 Starting frontend server..."
cd "$(dirname "$0")" && nohup python3 -m http.server 8080 --bind 127.0.0.1 > /tmp/frontend.log 2>&1 &
echo "Frontend PID: $!"

echo ""
echo "✅ Dashboard started!"
echo "📍 URL: http://localhost:8080/mission-control/"
echo ""
echo "To stop: fuser -k 8080/tcp"
