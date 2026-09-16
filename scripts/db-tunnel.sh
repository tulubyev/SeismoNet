#!/usr/bin/env bash
# SSH-туннель к PostgreSQL на VPS. Локальный порт 5433 -> VPS localhost:5432.
# Использование: scripts/db-tunnel.sh start|status|stop   (или npm run tunnel -- start)
set -euo pipefail

VPS_HOST="${VPS_HOST:-62.217.178.173}"
VPS_USER="${VPS_USER:-tulubyev}"
LOCAL_PORT="${TUNNEL_LOCAL_PORT:-5433}"
REMOTE_PORT=5432
PID_FILE="/tmp/seismonet-db-tunnel.pid"

is_up() {
  [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

case "${1:-status}" in
  start)
    if is_up; then
      echo "tunnel already running (pid $(cat "$PID_FILE")) on localhost:$LOCAL_PORT"
      exit 0
    fi
    if lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "port $LOCAL_PORT is busy by another process — pick TUNNEL_LOCAL_PORT" >&2
      exit 1
    fi
    ssh -f -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
        -L "$LOCAL_PORT:localhost:$REMOTE_PORT" "$VPS_USER@$VPS_HOST"
    # ssh -f forks; find the child listening on our port
    pgrep -f "ssh -f -N .*-L $LOCAL_PORT:localhost:$REMOTE_PORT" | head -1 > "$PID_FILE"
    echo "tunnel up: localhost:$LOCAL_PORT -> $VPS_HOST:$REMOTE_PORT (pid $(cat "$PID_FILE"))"
    ;;
  status)
    if is_up; then
      echo "tunnel running (pid $(cat "$PID_FILE"))"
    else
      echo "tunnel not running"
    fi
    if command -v pg_isready >/dev/null; then
      pg_isready -h localhost -p "$LOCAL_PORT" || true
    fi
    ;;
  stop)
    if is_up; then
      kill "$(cat "$PID_FILE")" && rm -f "$PID_FILE" && echo "tunnel stopped"
    else
      rm -f "$PID_FILE"; echo "tunnel not running"
    fi
    ;;
  *)
    echo "usage: $0 start|status|stop" >&2; exit 2 ;;
esac
