#!/bin/bash

# =============================================================================
# StreamingPro - Script de Deploy a Producción
# =============================================================================
# Este script automatiza el deploy al servidor de producción
# Servidor: 85.10.196.133
# =============================================================================

# Configuración del servidor
SERVER_IP="85.10.196.133"
SERVER_USER="root"
SERVER_PATH="/root/streamingpro-restreamer"

# Colors para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
show_info() {
    echo -e "${BLUE}📋 $1${NC}"
}

show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

show_error() {
    echo -e "${RED}❌ $1${NC}"
}

show_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "🚀 Iniciando deploy de StreamingPro a producción..."
echo "🎯 Servidor: $SERVER_IP"
echo ""

# Verificar que todo esté listo localmente
show_info "Verificando configuración local..."
if ! ./scripts/verify-prod-config.sh > /dev/null 2>&1; then
    show_error "La configuración local no está lista. Ejecuta: ./scripts/verify-prod-config.sh"
    exit 1
fi
show_success "Configuración local verificada"

# Confirmar deploy
echo ""
read -p "¿Continuar con el deploy? (s/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    show_warning "Deploy cancelado por el usuario"
    exit 0
fi

echo ""
show_info "Iniciando deploy..."

# Paso 1: Sincronizar archivos
show_info "1. Sincronizando archivos con el servidor..."
rsync -avz --exclude='node_modules' \
           --exclude='.git' \
           --exclude='apps/backend/coverage' \
           --exclude='apps/frontend/.next' \
           --exclude='backups' \
           --exclude='reports' \
           --exclude='.env.development' \
           --exclude='.env.production' \
           . $SERVER_USER@$SERVER_IP:$SERVER_PATH/

if [ $? -ne 0 ]; then
    show_error "Error al sincronizar archivos"
    exit 1
fi
show_success "Archivos sincronizados"

# Paso 2: Ejecutar comandos en el servidor
show_info "2. Ejecutando comandos en el servidor..."

ssh $SERVER_USER@$SERVER_IP << 'EOF'
    cd /root/streamingpro-restreamer
    
    # Colors para output en servidor
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
    
    show_info() {
        echo -e "${BLUE}📋 $1${NC}"
    }
    
    show_success() {
        echo -e "${GREEN}✅ $1${NC}"
    }
    
    show_error() {
        echo -e "${RED}❌ $1${NC}"
    }
    
    echo "🖥️  Ejecutando comandos en el servidor..."
    
    # Copiar archivo de configuración
    show_info "Copiando configuración de producción..."
    if [ -f "env.production.READY" ]; then
        cp env.production.READY .env.production
        show_success "Archivo .env.production creado"
    else
        show_error "No se encontró env.production.READY"
        exit 1
    fi
    
    # Parar contenedores existentes
    show_info "Parando contenedores existentes..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production down
    
    # Limpiar imágenes antiguas para forzar rebuild
    show_info "Limpiando imágenes antiguas..."
    docker image prune -f
    
    # Construir nuevas imágenes sin caché
    show_info "Construyendo nuevas imágenes (puede tomar varios minutos)..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
    
    if [ $? -ne 0 ]; then
        show_error "Error al construir imágenes"
        exit 1
    fi
    show_success "Imágenes construidas correctamente"
    
    # Levantar servicios
    show_info "Levantando servicios..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
    
    if [ $? -ne 0 ]; then
        show_error "Error al levantar servicios"
        exit 1
    fi
    show_success "Servicios iniciados"
    
    # Esperar un poco para que los servicios se estabilicen
    show_info "Esperando que los servicios se estabilicen..."
    sleep 30
    
    # Verificar estado de los servicios
    show_info "Verificando estado de los servicios..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production ps
    
    echo ""
    show_success "¡Deploy completado!"
    echo ""
    echo "🌐 URLs de acceso:"
    echo "  Frontend: https://central.streamingpro.es"
    echo "  Backend API: https://central.streamingpro.es/api"
    echo "  HLS Streams: https://central.streamingpro.es/hls"
    echo ""
    echo "🎥 Puertos de streaming:"
    echo "  RTMP: rtmp://85.10.196.133:1935/live/stream_name"
    echo "  SRT: srt://85.10.196.133:8890?streamid=publish:stream_name"
    echo "  RTSP: rtsp://85.10.196.133:8554/stream_name"
    echo ""
EOF

if [ $? -ne 0 ]; then
    show_error "Error durante la ejecución en el servidor"
    exit 1
fi

echo ""
show_success "🎉 ¡Deploy completado exitosamente!"
echo ""
show_info "📊 Para verificar logs:"
echo "  ssh $SERVER_USER@$SERVER_IP 'cd $SERVER_PATH && docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f'"
echo ""
show_info "🔍 Para verificar estado:"
echo "  ssh $SERVER_USER@$SERVER_IP 'cd $SERVER_PATH && docker-compose -f docker-compose.prod.yml --env-file .env.production ps'"
echo "" 