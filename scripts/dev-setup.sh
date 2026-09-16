#!/usr/bin/env bash
# Идемпотентная подготовка локальной среды разработки (Mac).
# Использование: npm run setup
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ node $(node -v), npm $(npm -v)"
node -e 'const [maj]=process.versions.node.split(".").map(Number); if (maj<20) { console.error("Node >= 20 required"); process.exit(1) }'

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "▶ создан .env из .env.example — заполните DATABASE_URL и SESSION_SECRET"
fi

echo "▶ npm install"
npm install --no-fund --no-audit

echo "▶ SSH-туннель к БД"
bash scripts/db-tunnel.sh start
bash scripts/db-tunnel.sh status

echo
echo "Готово. Запуск: npm run dev  →  http://localhost:${PORT:-5000}"
