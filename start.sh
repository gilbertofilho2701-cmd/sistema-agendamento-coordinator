#!/bin/bash
# Sobe o sistema localmente usando exatamente o mesmo código do Vercel.
# (Antes existia um server.js separado, que divergia e causava bugs só em produção.)
cd "$(dirname "$0")"
lsof -t -i :3000 2>/dev/null | xargs -r kill -9 2>/dev/null
npm run build || exit 1
nohup npm start > /tmp/server_coord.log 2>&1 &
echo $! > /tmp/server_coord.pid
echo "Servidor subiu com PID $(cat /tmp/server_coord.pid) — log em /tmp/server_coord.log"
sleep 3
curl -s -o /dev/null -w "http://localhost:3000 -> HTTP %{http_code}\n" http://localhost:3000
