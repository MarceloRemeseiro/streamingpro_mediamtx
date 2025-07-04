#!/bin/bash

# =============================================================================
# STREAMINGPRO - SCRIPT DE DEPLOYMENT PRINCIPAL
# =============================================================================
# Script único para gestión completa del deployment en producción
# Versión optimizada con todas las configuraciones probadas
# =============================================================================

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función de logging mejorada
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

info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# =============================================================================
# CONFIGURACIÓN
# =============================================================================

PROJECT_NAME="streamingpro-restreamer"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"

# Obtener IP del servidor
SERVER_IP=$(hostname -I | awk '{print $1}')

# =============================================================================
# VERIFICACIONES PREVIAS
# =============================================================================

check_requirements() {
    log "🔍 Verificando requisitos previos..."
    
    # Verificar que estamos en el directorio correcto
    if [ ! -f "package.json" ] || [ ! -f "$COMPOSE_FILE" ]; then
        error "Este script debe ejecutarse desde la raíz del proyecto StreamingPro"
    fi
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        error "Docker no está instalado. Instala Docker primero."
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose no está instalado"
    fi
    
    # Verificar archivo de entorno
    if [ ! -f "$ENV_FILE" ]; then
        error "Archivo $ENV_FILE no encontrado. Copia env.production.READY como $ENV_FILE y configúralo"
    fi
    
    # Verificar variables críticas
    source "$ENV_FILE"
    if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_DB" ]; then
        error "Variables de base de datos no configuradas en $ENV_FILE"
    fi
    
    success "Verificaciones previas completadas"
}

# =============================================================================
# FUNCIONES DE GESTIÓN
# =============================================================================

backup_database() {
    log "📦 Creando backup de la base de datos..."
    
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"
    
    # Solo hacer backup si hay contenedor de postgres corriendo
    if docker ps --filter "name=streamingpro_postgres_prod" --format "table {{.Names}}" | grep -q streamingpro_postgres_prod; then
        source "$ENV_FILE"
        docker exec streamingpro_postgres_prod pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"
        success "Backup creado: $BACKUP_FILE"
    else
        warning "No hay base de datos ejecutándose, saltando backup"
    fi
}

clean_docker_resources() {
    log "🧹 Limpiando recursos Docker (modo seguro para entorno compartido)..."
    
    # Usar 'down' con flags --rmi y --volumes es la forma más segura
    # de limpiar SOLO los recursos de ESTE proyecto sin afectar a otros.
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans --rmi all --volumes
    
    success "Recursos Docker del proyecto actual limpiados exitosamente"
}

build_images() {
    log "🏗️  Construyendo imágenes Docker..."
    
    # Build con --no-cache para asegurar imagen limpia
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache --parallel
    
    success "Imágenes construidas exitosamente"
}

start_services() {
    log "🚀 Iniciando servicios..."
    
    # Levantar servicios en orden correcto
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    log "⏳ Esperando a que los servicios estén listos..."
    sleep 15
    
    success "Servicios iniciados"
}

wait_for_services() {
    log "⏳ Esperando a que todos los servicios estén healthy..."
    
    local max_attempts=20
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local backend_healthy=$(docker inspect streamingpro_backend_prod --format='{{.State.Health.Status}}' 2>/dev/null || echo "starting")
        local postgres_healthy=$(docker inspect streamingpro_postgres_prod --format='{{.State.Health.Status}}' 2>/dev/null || echo "starting")
        local mediamtx_healthy=$(docker inspect streamingpro_mediamtx_prod --format='{{.State.Health.Status}}' 2>/dev/null || echo "starting")
        
        if [[ "$backend_healthy" == "healthy" && "$postgres_healthy" == "healthy" && "$mediamtx_healthy" == "healthy" ]]; then
            success "Todos los servicios están healthy"
            return 0
        fi
        
        info "Esperando servicios... Backend: $backend_healthy, Postgres: $postgres_healthy, MediaMTX: $mediamtx_healthy"
        sleep 5
        ((attempt++))
    done
    
    warning "Algunos servicios pueden no estar completamente listos. Continuando..."
}

health_check() {
    log "🔍 Verificando salud de los servicios..."
    
    # Verificar backend (usar 127.0.0.1 para IPv4)
    if curl -f -s http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
        success "Backend está funcionando correctamente"
    else
        warning "Backend no responde en health check"
        info "Verificando logs del backend..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs backend --tail=10
    fi
    
    # Verificar MediaMTX
    if curl -f -s http://127.0.0.1:9997/v3/config/global/get > /dev/null 2>&1; then
        success "MediaMTX está funcionando correctamente"
    else
        warning "MediaMTX no responde"
    fi
    
    # Verificar frontend
    if curl -f -s http://127.0.0.1:3001 > /dev/null 2>&1; then
        success "Frontend está funcionando correctamente"
    else
        warning "Frontend no responde"
    fi
    
    # Mostrar estado de contenedores
    log "📊 Estado de contenedores:"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
}

show_system_info() {
    log "📋 Información del sistema StreamingPro:"
    echo ""
    echo "🌐 URLs de acceso:"
    echo "   Frontend: http://$SERVER_IP:3001"
    echo "   Backend:  http://$SERVER_IP:3000/api"
    echo "   Health:   http://$SERVER_IP:3000/api/health"
    echo ""
    echo "📡 Puertos de streaming:"
    echo "   SRT:      srt://$SERVER_IP:8890"
    echo "   RTMP:     rtmp://$SERVER_IP:1935"
    echo "   RTSP:     rtsp://$SERVER_IP:8554"
    echo "   HLS:      http://$SERVER_IP:8888"
    echo "   WebRTC:   http://$SERVER_IP:8889"
    echo ""
    echo "🔧 Comandos útiles:"
    echo "   Ver logs:        docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f"
    echo "   Parar servicios: docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE down"
    echo "   Estado:          docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps"
    echo "   Reiniciar:       ./scripts/deploy-prod.sh"
    echo ""
    echo "📁 Archivos importantes:"
    echo "   Configuración:   $ENV_FILE"
    echo "   Docker Compose:  $COMPOSE_FILE"
    echo "   Backups:         $BACKUP_DIR/"
    echo ""
}

show_logs() {
    log "📝 Mostrando logs en vivo (Ctrl+C para salir)..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f
}

stop_services() {
    log "🛑 Parando todos los servicios..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    success "Servicios detenidos"
}

# =============================================================================
# ACCIONES PRINCIPALES
# =============================================================================

full_deployment() {
    log "🚀 Iniciando deployment completo..."
    
    check_requirements
    backup_database
    clean_docker_resources
    build_images
    start_services
    wait_for_services
    health_check
    show_system_info
    
    success "🎉 Deployment completo exitoso!"
}

quick_update() {
    log "🔄 Actualizando aplicación (update rápido)..."
    
    check_requirements
    backup_database
    
    # Solo rebuild y restart de backend y frontend
    log "🏗️  Rebuilding solo backend y frontend..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache backend frontend
    
    log "🔄 Reiniciando servicios..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps backend frontend
    
    wait_for_services
    health_check
    
    success "🎉 Actualización completada!"
}

clean_deployment() {
    log "🧹 Deployment con limpieza completa..."
    
    check_requirements
    backup_database
    
    # Limpieza más agresiva
    log "🧹 Limpieza completa de Docker..."
    docker system prune -f
    clean_docker_resources
    
    build_images
    start_services
    wait_for_services
    health_check
    show_system_info
    
    success "🎉 Deployment con limpieza completo!"
}

# =============================================================================
# MENÚ PRINCIPAL
# =============================================================================

show_menu() {
    echo ""
    echo "🚀 StreamingPro - Gestión de Deployment"
    echo "======================================="
    echo ""
    echo "1) 🚀 Deployment completo (recomendado)"
    echo "2) 🔄 Update rápido (solo backend/frontend)"
    echo "3) 🧹 Deployment con limpieza completa"
    echo "4) 📦 Solo backup de base de datos"
    echo "5) 🔍 Verificar estado de servicios"
    echo "6) 📋 Mostrar información del sistema"
    echo "7) 📝 Ver logs en vivo"
    echo "8) 🛑 Parar todos los servicios"
    echo "9) ❌ Salir"
    echo ""
    read -p "Selecciona una opción [1-9]: " choice
}

# =============================================================================
# EJECUCIÓN PRINCIPAL
# =============================================================================

# Si se pasa un argumento, ejecutar directamente
if [ $# -eq 1 ]; then
    case $1 in
        "deploy"|"full")
            full_deployment
            exit 0
            ;;
        "update"|"quick")
            quick_update
            exit 0
            ;;
        "clean")
            clean_deployment
            exit 0
            ;;
        "status")
            check_requirements
            health_check
            exit 0
            ;;
        "stop")
            stop_services
            exit 0
            ;;
        "logs")
            show_logs
            exit 0
            ;;
        "info")
            show_system_info
            exit 0
            ;;
        *)
            echo "Uso: $0 [deploy|update|clean|status|stop|logs|info]"
            exit 1
            ;;
    esac
fi

# Mostrar menú interactivo
while true; do
    show_menu
    
    case $choice in
        1)
            full_deployment
            ;;
        2)
            quick_update
            ;;
        3)
            clean_deployment
            ;;
        4)
            backup_database
            ;;
        5)
            check_requirements
            health_check
            ;;
        6)
            show_system_info
            ;;
        7)
            show_logs
            ;;
        8)
            stop_services
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