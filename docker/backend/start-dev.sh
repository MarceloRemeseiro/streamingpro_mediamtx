#!/bin/bash
set -e

echo "🚀 Iniciando backend de desarrollo..."

# Cambiar al directorio del backend
cd /app/apps/backend

echo "📊 Verificando estado de las migraciones..."
npx prisma migrate status || true

echo "🔄 Aplicando migraciones pendientes..."
npx prisma migrate deploy

echo "✅ Migraciones aplicadas correctamente"

echo "🏃 Iniciando servidor de desarrollo..."
cd /app
exec pnpm --filter backend run start:dev 