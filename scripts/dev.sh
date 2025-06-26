#!/bin/bash

# Script para gestionar el entorno de desarrollo de StreamingPro

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}StreamingPro - Entorno de Desarrollo${NC}"
    echo ""
    echo "Uso: $0 [COMANDO]"
    echo ""
    echo "Comandos disponibles:"
    echo "  start       - Iniciar todos los servicios de desarrollo"
    echo "  stop        - Parar todos los servicios"
    echo "  restart     - Reiniciar todos los servicios"
    echo "  logs        - Mostrar logs de todos los servicios"
    echo "  logs [srv]  - Mostrar logs de un servicio específico (backend, frontend, mediamtx, postgres)"
    echo "  build       - Construir las imágenes de desarrollo"
    echo "  clean       - Limpiar volúmenes y contenedores"
    echo "  shell [srv] - Abrir shell en un servicio (backend, frontend, mediamtx)"
    echo "  test        - Ejecutar tests del backend"
    echo "  status      - Mostrar estado de los servicios"
    echo "  help        - Mostrar esta ayuda"
    echo ""
}

# Función para crear directorios necesarios
create_directories() {
    echo -e "${YELLOW}Creando directorios necesarios...${NC}"
    mkdir -p logs/backend
    mkdir -p logs/frontend
    mkdir -p logs/mediamtx
    echo -e "${GREEN}Directorios creados.${NC}"
}

# Función para iniciar servicios
start_services() {
    echo -e "${YELLOW}Iniciando servicios de desarrollo...${NC}"
    create_directories
    docker-compose -f docker-compose.dev.yml up -d
    echo -e "${GREEN}Servicios iniciados.${NC}"
    echo ""
    echo -e "${BLUE}URLs disponibles:${NC}"
    echo "  Frontend:    http://localhost:3001"
    echo "  Backend API: http://localhost:3000"
    echo "  MediaMTX API: http://localhost:9997"
    echo "  MediaMTX HLS: http://localhost:8888"
    echo "  MediaMTX WebRTC: http://localhost:8889"
    echo "  PostgreSQL:  localhost:5432"
    echo ""
}

# Función para parar servicios
stop_services() {
    echo -e "${YELLOW}Parando servicios...${NC}"
    docker-compose -f docker-compose.dev.yml down
    echo -e "${GREEN}Servicios parados.${NC}"
}

# Función para reiniciar servicios
restart_services() {
    echo -e "${YELLOW}Reiniciando servicios...${NC}"
    docker-compose -f docker-compose.dev.yml restart
    echo -e "${GREEN}Servicios reiniciados.${NC}"
}

# Función para mostrar logs
show_logs() {
    if [ -z "$1" ]; then
        docker-compose -f docker-compose.dev.yml logs -f
    else
        case $1 in
            backend)
                docker-compose -f docker-compose.dev.yml logs -f backend
                ;;
            frontend)
                docker-compose -f docker-compose.dev.yml logs -f frontend
                ;;
            mediamtx)
                docker-compose -f docker-compose.dev.yml logs -f mediamtx
                ;;
            postgres)
                docker-compose -f docker-compose.dev.yml logs -f postgres
                ;;
            *)
                echo -e "${RED}Servicio no reconocido: $1${NC}"
                echo "Servicios disponibles: backend, frontend, mediamtx, postgres"
                exit 1
                ;;
        esac
    fi
}

# Función para construir imágenes
build_images() {
    echo -e "${YELLOW}Construyendo imágenes de desarrollo...${NC}"
    docker-compose -f docker-compose.dev.yml build --no-cache
    echo -e "${GREEN}Imágenes construidas.${NC}"
}

# Función para limpiar
clean_environment() {
    echo -e "${YELLOW}Limpiando entorno...${NC}"
    docker-compose -f docker-compose.dev.yml down -v --remove-orphans
    docker system prune -f
    echo -e "${GREEN}Entorno limpiado.${NC}"
}

# Función para abrir shell
open_shell() {
    if [ -z "$1" ]; then
        echo -e "${RED}Especifica un servicio: backend, frontend, mediamtx${NC}"
        exit 1
    fi
    
    case $1 in
        backend)
            docker-compose -f docker-compose.dev.yml exec backend /bin/bash
            ;;
        frontend)
            docker-compose -f docker-compose.dev.yml exec frontend /bin/bash
            ;;
        mediamtx)
            docker-compose -f docker-compose.dev.yml exec mediamtx /bin/bash
            ;;
        *)
            echo -e "${RED}Servicio no reconocido: $1${NC}"
            echo "Servicios disponibles: backend, frontend, mediamtx"
            exit 1
            ;;
    esac
}

# Función para ejecutar tests
run_tests() {
    echo -e "${YELLOW}Ejecutando tests del backend...${NC}"
    docker-compose -f docker-compose.dev.yml exec backend pnpm run test
}

# Función para mostrar estado
show_status() {
    echo -e "${BLUE}Estado de los servicios:${NC}"
    docker-compose -f docker-compose.dev.yml ps
}

# Procesar argumentos
case "${1:-help}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs "$2"
        ;;
    build)
        build_images
        ;;
    clean)
        clean_environment
        ;;
    shell)
        open_shell "$2"
        ;;
    test)
        run_tests
        ;;
    status)
        show_status
        ;;
    help|*)
        show_help
        ;;
esac 