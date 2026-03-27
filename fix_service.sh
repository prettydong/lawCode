#!/bin/bash
# fix_service.sh - run on server to set up HTTPS correctly

# Stop all PM2 processes
npx pm2 delete all 2>/dev/null || true

# Kill anything on ports 3000 and 12345
kill $(lsof -t -i:3000) 2>/dev/null || true
kill $(lsof -t -i:12345) 2>/dev/null || true
sleep 1

# Restart nginx on port 12345 with SSL
systemctl restart nginx

# Start Next.js on port 3000
cd /root/lawCode_web
export PORT=3000
npx pm2 start npm --name lawCode-web -- start
npx pm2 save

# Wait for Next.js to start
sleep 3

# Test
echo "=== TESTING ==="
curl -k -s -I https://127.0.0.1:12345/ | head -5
echo "=== DONE ==="
