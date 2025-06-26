#!/bin/bash
set -e

echo "🚀 Iniciando backend de producción..."

# Cambiar al directorio del backend
cd /app/apps/backend

echo "🏃 Iniciando servidor de producción..."
cd /app
exec pnpm --filter backend run start:prod 