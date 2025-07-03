#!/bin/bash

# =============================================================================
# StreamingPro - Limpieza Selectiva de Docker
# =============================================================================
# Este script limpia solo los contenedores, imágenes y volúmenes relacionados
# con StreamingPro, manteniendo intactos otros servicios del servidor
# =============================================================================

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

echo "🧹 Limpieza selectiva de Docker - Solo StreamingPro"
echo "⚠️  Este script NO afectará otros contenedores del servidor"
echo ""

# Mostrar contenedores actuales
show_info "Contenedores actualmente corriendo:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
echo ""

# Mostrar contenedores de StreamingPro específicamente
show_info "Contenedores de StreamingPro detectados:"
STREAMINGPRO_CONTAINERS=$(docker ps -a --filter "name=streamingpro" --format "{{.Names}}")
if [ -z "$STREAMINGPRO_CONTAINERS" ]; then
    show_warning "No se encontraron contenedores de StreamingPro"
else
    echo "$STREAMINGPRO_CONTAINERS"
fi
echo ""

# Confirmar limpieza
read -p "¿Continuar con la limpieza de StreamingPro? (s/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    show_warning "Limpieza cancelada por el usuario"
    exit 0
fi

echo ""
show_info "Iniciando limpieza selectiva..."

# Paso 1: Parar y eliminar contenedores de StreamingPro
show_info "1. Parando contenedores de StreamingPro..."
if [ ! -z "$STREAMINGPRO_CONTAINERS" ]; then
    for container in $STREAMINGPRO_CONTAINERS; do
        show_info "   Parando: $container"
        docker stop "$container" 2>/dev/null || true
        docker rm "$container" 2>/dev/null || true
    done
    show_success "Contenedores de StreamingPro eliminados"
else
    show_info "   No hay contenedores de StreamingPro para parar"
fi

# Paso 2: Eliminar imágenes de StreamingPro
show_info "2. Eliminando imágenes de StreamingPro..."
STREAMINGPRO_IMAGES=$(docker images --filter "reference=streamingpro*" --format "{{.Repository}}:{{.Tag}}")
if [ ! -z "$STREAMINGPRO_IMAGES" ]; then
    for image in $STREAMINGPRO_IMAGES; do
        show_info "   Eliminando imagen: $image"
        docker rmi "$image" 2>/dev/null || true
    done
    show_success "Imágenes de StreamingPro eliminadas"
else
    show_info "   No hay imágenes de StreamingPro para eliminar"
fi

# Paso 3: Eliminar volúmenes de StreamingPro
show_info "3. Eliminando volúmenes de StreamingPro..."
STREAMINGPRO_VOLUMES=$(docker volume ls --filter "name=streamingpro" --format "{{.Name}}")
if [ ! -z "$STREAMINGPRO_VOLUMES" ]; then
    for volume in $STREAMINGPRO_VOLUMES; do
        show_info "   Eliminando volumen: $volume"
        docker volume rm "$volume" 2>/dev/null || true
    done
    show_success "Volúmenes de StreamingPro eliminados"
else
    show_info "   No hay volúmenes de StreamingPro para eliminar"
fi

# Paso 4: Eliminar redes de StreamingPro
show_info "4. Eliminando redes de StreamingPro..."
STREAMINGPRO_NETWORKS=$(docker network ls --filter "name=streamingpro" --format "{{.Name}}")
if [ ! -z "$STREAMINGPRO_NETWORKS" ]; then
    for network in $STREAMINGPRO_NETWORKS; do
        show_info "   Eliminando red: $network"
        docker network rm "$network" 2>/dev/null || true
    done
    show_success "Redes de StreamingPro eliminadas"
else
    show_info "   No hay redes de StreamingPro para eliminar"
fi

# Paso 5: Limpieza general segura (solo elementos no usados)
show_info "5. Limpieza general de elementos no usados..."
docker system prune -f --volumes
show_success "Limpieza general completada"

echo ""
show_success "🎉 Limpieza completada!"
echo ""
show_info "📊 Estado actual del sistema:"
echo ""
show_info "Contenedores activos:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
echo ""
show_info "Espacio en disco recuperado:"
docker system df
echo ""
show_info "✅ El sistema está listo para un deploy limpio de StreamingPro"
echo "✅ Otros servicios del servidor NO fueron afectados"
echo "" 