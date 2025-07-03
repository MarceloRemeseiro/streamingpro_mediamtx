#!/bin/bash

# =============================================================================
# STREAMINGPRO - SCRIPT DE DEPLOYMENT PRODUCCIÓN
# =============================================================================
# Este script automatiza el deployment en el servidor de producción
# =============================================================================

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# =============================================================================
# CONFIGURACIÓN
# =============================================================================

PROJECT_NAME="streamingpro-restreamer"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# =============================================================================
# VERIFICACIONES PREVIAS
# =============================================================================

log "🔍 Verificando requisitos previos..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ] || [ ! -f "$COMPOSE_FILE" ]; then
    error "Este script debe ejecutarse desde la raíz del proyecto"
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    error "Docker no está instalado"
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error "Docker Compose no está instalado"
fi

# Verificar archivo de entorno
if [ ! -f "$ENV_FILE" ]; then
    error "Archivo $ENV_FILE no encontrado. Copia env.production.template como $ENV_FILE y configúralo"
fi

success "Verificaciones previas completadas"

# =============================================================================
# FUNCIONES
# =============================================================================

backup_database() {
    log "📦 Creando backup de la base de datos..."
    
    mkdir -p ./backups
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="./backups/backup_${TIMESTAMP}.sql"
    
    # Solo hacer backup si hay contenedor de postgres corriendo
    if docker ps --filter "name=streamingpro_postgres_prod" --format "table {{.Names}}" | grep -q streamingpro_postgres_prod; then
        docker exec streamingpro_postgres_prod pg_dump -U ${POSTGRES_USER:-streamingpro_user} ${POSTGRES_DB:-streamingpro_production} > "$BACKUP_FILE"
        success "Backup creado: $BACKUP_FILE"
    else
        warning "No hay base de datos ejecutándose, saltando backup"
    fi
}

build_images() {
    log "🏗️  Construyendo imágenes Docker..."
    
    # Build con cache para optimizar tiempo
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --parallel
    
    success "Imágenes construidas exitosamente"
}

migrate_database() {
    log "🗃️  Configurando base de datos con TypeORM..."
    
    # TypeORM con synchronize: true creará las tablas automáticamente
    # Solo necesitamos esperar a que el backend esté listo y conecte a la BD
    log "⏳ Esperando a que TypeORM sincronice las tablas..."
    
    # Esperar un poco más para que TypeORM termine la sincronización
    sleep 5
    
    success "Base de datos configurada con TypeORM"
}

health_check() {
    log "🔍 Verificando salud de los servicios..."
    
    # Esperar un poco para que los servicios se inicialicen
    sleep 10
    
    # Verificar backend
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        success "Backend está funcionando"
    else
        warning "Backend no responde en el health check"
    fi
    
    # Verificar MediaMTX
    if curl -f http://localhost:9997/v3/config/global/get > /dev/null 2>&1; then
        success "MediaMTX está funcionando"
    else
        warning "MediaMTX no responde"
    fi
    
    # Verificar frontend
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        success "Frontend está funcionando"
    else
        warning "Frontend no responde"
    fi
}

show_info() {
    log "📋 Información del deployment:"
    echo ""
    echo "🌐 URLs de acceso:"
    echo "   Frontend: http://$(hostname -I | awk '{print $1}'):3001"
    echo "   Backend:  http://$(hostname -I | awk '{print $1}'):3000/api"
    echo ""
    echo "📡 Puertos de streaming:"
    echo "   SRT:      $(hostname -I | awk '{print $1}'):8890"
    echo "   RTMP:     $(hostname -I | awk '{print $1}'):1935"
    echo "   HLS:      http://$(hostname -I | awk '{print $1}'):8888"
    echo "   WebRTC:   http://$(hostname -I | awk '{print $1}'):8889"
    echo ""
    echo "🔧 Comandos útiles:"
    echo "   Ver logs:        docker-compose -f $COMPOSE_FILE logs -f"
    echo "   Parar servicios: docker-compose -f $COMPOSE_FILE down"
    echo "   Reiniciar:       ./scripts/deploy-prod.sh"
    echo ""
    echo "🌐 Configurar Nginx Proxy Manager:"
    echo "   Consulta: NGINX-PROXY-MANAGER-SETUP.md"
    echo ""
}

# =============================================================================
# MENÚ PRINCIPAL
# =============================================================================

show_menu() {
    echo ""
    echo "🚀 StreamingPro - Deployment Producción"
    echo "========================================="
    echo ""
    echo "1) 🆕 Deployment completo (nuevo)"
    echo "2) 🔄 Actualizar aplicación (mantener DB)"
    echo "3) 📦 Solo backup de base de datos"
    echo "4) 🏗️  Solo construir imágenes"
    echo "5) 🔍 Verificar estado de servicios"
    echo "6) 📋 Mostrar información del sistema"
    echo "7) 🛑 Parar todos los servicios"
    echo "8) 📝 Ver logs en vivo"
    echo "9) ❌ Salir"
    echo ""
    read -p "Selecciona una opción [1-9]: " choice
}

# =============================================================================
# ACCIONES PRINCIPALES
# =============================================================================

full_deployment() {
    log "🚀 Iniciando deployment completo..."
    
    # Parar servicios existentes si los hay
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    
    # Backup si hay datos
    backup_database
    
    # Construir imágenes
    build_images
    
    # Levantar servicios
    log "🚀 Levantando servicios..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    # Esperar a que la base de datos esté lista
    log "⏳ Esperando a que la base de datos esté lista..."
    sleep 15
    
    # Migrar base de datos
    migrate_database
    
    # Verificar servicios
    health_check
    
    # Mostrar información
    show_info
    
    success "🎉 Deployment completo exitoso!"
}

update_deployment() {
    log "🔄 Actualizando aplicación..."
    
    # Backup antes de actualizar
    backup_database
    
    # Construir nuevas imágenes
    build_images
    
    # Actualizar servicios (mantener base de datos)
    log "🔄 Actualizando servicios..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps backend frontend mediamtx
    
    # Migrar base de datos por si hay cambios
    sleep 10
    migrate_database
    
    # Verificar servicios
    health_check
    
    success "🎉 Actualización completada!"
}

stop_services() {
    log "🛑 Parando todos los servicios..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    success "Servicios detenidos"
}

show_logs() {
    log "📝 Mostrando logs en vivo (Ctrl+C para salir)..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f
}

check_status() {
    log "🔍 Estado de los servicios:"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    echo ""
    health_check
}

# =============================================================================
# EJECUTAR MENÚ
# =============================================================================

while true; do
    show_menu
    
    case $choice in
        1)
            full_deployment
            ;;
        2)
            update_deployment
            ;;
        3)
            backup_database
            ;;
        4)
            build_images
            ;;
        5)
            check_status
            ;;
        6)
            show_info
            ;;
        7)
            stop_services
            ;;
        8)
            show_logs
            ;;
        9)
            log "👋 ¡Hasta luego!"
            exit 0
            ;;
        *)
            error "Opción inválida. Por favor selecciona 1-9."
            ;;
    esac
    
    echo ""
    read -p "Presiona Enter para continuar..."
done 