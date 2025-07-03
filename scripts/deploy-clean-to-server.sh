#!/bin/bash

# =============================================================================
# StreamingPro - Deploy Limpio a Producción
# =============================================================================
# Este script hace limpieza selectiva de Docker y luego deploy completo
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

echo "🧹🚀 Deploy Limpio de StreamingPro a Producción"
echo "🎯 Servidor: $SERVER_IP"
echo "⚠️  Este proceso incluye limpieza selectiva de Docker"
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
show_warning "ATENCIÓN: Este proceso hará:"
echo "  1. Limpieza selectiva de contenedores StreamingPro"
echo "  2. Sincronización completa de archivos"
echo "  3. Build completo sin caché"
echo "  4. Deploy desde cero"
echo ""
read -p "¿Continuar con el deploy limpio? (s/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    show_warning "Deploy cancelado por el usuario"
    exit 0
fi

echo ""
show_info "Iniciando deploy limpio..."

# Paso 1: Sincronizar archivos incluyendo script de limpieza
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
show_success "Archivos sincronizados (incluido script de limpieza)"

# Paso 2: Ejecutar limpieza y deploy en el servidor
show_info "2. Ejecutando limpieza y deploy en el servidor..."

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
    
    show_warning() {
        echo -e "${YELLOW}⚠️  $1${NC}"
    }
    
    echo "🖥️  Ejecutando limpieza y deploy en el servidor..."
    echo ""
    
    # Hacer ejecutable el script de limpieza
    chmod +x scripts/clean-streamingpro-docker.sh
    
    # Ejecutar limpieza selectiva automáticamente
    show_info "🧹 Ejecutando limpieza selectiva de StreamingPro..."
    echo "s" | ./scripts/clean-streamingpro-docker.sh
    
    if [ $? -ne 0 ]; then
        show_error "Error durante la limpieza selectiva"
        exit 1
    fi
    show_success "Limpieza selectiva completada"
    
    echo ""
    show_info "🚀 Iniciando deploy desde cero..."
    
    # Copiar archivo de configuración
    show_info "Copiando configuración de producción..."
    if [ -f "env.production.READY" ]; then
        cp env.production.READY .env.production
        show_success "Archivo .env.production creado"
    else
        show_error "No se encontró env.production.READY"
        exit 1
    fi
    
    # Construir nuevas imágenes sin caché
    show_info "Construyendo nuevas imágenes desde cero (puede tomar varios minutos)..."
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
    
    # Esperar que los servicios se estabilicen
    show_info "Esperando que los servicios se estabilicen..."
    sleep 45
    
    # Verificar estado de los servicios
    show_info "Verificando estado de los servicios..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production ps
    
    echo ""
    show_info "Verificando health de los servicios..."
    
    # Verificar backend
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        show_success "Backend: Health check OK"
    else
        show_warning "Backend: Health check falló (puede necesitar más tiempo)"
    fi
    
    # Verificar frontend
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        show_success "Frontend: Responde OK"
    else
        show_warning "Frontend: No responde (puede necesitar más tiempo)"
    fi
    
    # Verificar MediaMTX
    if nc -z localhost 9997 > /dev/null 2>&1; then
        show_success "MediaMTX: API responde OK"
    else
        show_warning "MediaMTX: API no responde (puede necesitar más tiempo)"
    fi
    
    echo ""
    show_success "¡Deploy limpio completado!"
    echo ""
    echo "🌐 URLs de acceso:"
    echo "  Frontend: https://central.streamingpro.es"
    echo "  Backend API: https://central.streamingpro.es/api"
    echo "  Health Check: https://central.streamingpro.es/api/health"
    echo "  HLS Streams: https://central.streamingpro.es/hls"
    echo ""
    echo "🎥 Puertos de streaming:"
    echo "  RTMP: rtmp://85.10.196.133:1935/live/stream_name"
    echo "  SRT: srt://85.10.196.133:8890?streamid=publish:stream_name"
    echo "  RTSP: rtsp://85.10.196.133:8554/stream_name"
    echo ""
    echo "📊 Espacio en disco:"
    docker system df
    echo ""
EOF

if [ $? -ne 0 ]; then
    show_error "Error durante la ejecución en el servidor"
    exit 1
fi

echo ""
show_success "🎉 ¡Deploy limpio completado exitosamente!"
echo ""
show_info "📊 Comandos útiles post-deploy:"
echo "  # Ver logs en tiempo real:"
echo "  ssh $SERVER_USER@$SERVER_IP 'cd $SERVER_PATH && docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f'"
echo ""
echo "  # Verificar estado:"
echo "  ssh $SERVER_USER@$SERVER_IP 'cd $SERVER_PATH && docker-compose -f docker-compose.prod.yml --env-file .env.production ps'"
echo ""
echo "  # Verificar health checks:"
echo "  ssh $SERVER_USER@$SERVER_IP 'curl -f http://localhost:3000/api/health && echo \"Backend OK\"'"
echo "" 