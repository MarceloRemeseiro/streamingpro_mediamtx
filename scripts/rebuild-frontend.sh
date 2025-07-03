#!/bin/bash
# =============================================================================
# REBUILD FRONTEND - StreamingPro
# =============================================================================
# Rebuilds solo el frontend con las nuevas variables de entorno
# Útil cuando solo cambian las URLs del frontend

set -e

echo "🔄 Rebuilding Frontend con nuevas variables de entorno..."
echo "📍 Conectando al servidor..."

# Subir solo el archivo .env.production y rebuild del frontend
scp .env.production streamingpro@85.10.196.133:~/streamingpro-restreamer/
scp docker-compose.prod.yml streamingpro@85.10.196.133:~/streamingpro-restreamer/

echo "🛠️ Rebuilding solo el frontend..."
ssh streamingpro@85.10.196.133 "
  cd ~/streamingpro-restreamer && 
  echo '🔄 Parando frontend...' &&
  docker-compose -f docker-compose.prod.yml --env-file .env.production stop frontend &&
  echo '🗑️ Removiendo imagen anterior del frontend...' &&
  docker rmi streamingpro-restreamer_frontend:latest || true &&
  echo '🏗️ Rebuilding frontend con nuevas variables...' &&
  docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache frontend &&
  echo '🚀 Levantando frontend...' &&
  docker-compose -f docker-compose.prod.yml --env-file .env.production up -d frontend &&
  echo '✅ Frontend rebuildeado exitosamente!'
"

echo "✅ Rebuild completado!"
echo "📋 Verificando estado..."
ssh streamingpro@85.10.196.133 "cd ~/streamingpro-restreamer && docker-compose -f docker-compose.prod.yml --env-file .env.production ps" 