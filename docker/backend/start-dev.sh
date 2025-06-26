#!/bin/bash
set -e

echo "🚀 Iniciando backend de desarrollo..."

# Cambiar al directorio del backend
cd /app/apps/backend

echo "🏃 Iniciando servidor de desarrollo..."
cd /app
exec pnpm --filter backend run start:dev 