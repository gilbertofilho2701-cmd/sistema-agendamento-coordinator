#!/bin/bash
cd /home/gilmadara/whisper.cpp/coordinator-app
lsof -t -i :3000 2>/dev/null | xargs kill -9 2>/dev/null
node server.js > /tmp/server_coord.log 2>&1 &
echo $! > /tmp/server_coord.pid
echo "Servidor subiu com PID $(cat /tmp/server_coord.pid)"
sleep 2
curl -s http://localhost:3000 | head -c 200 && echo " - OK"
