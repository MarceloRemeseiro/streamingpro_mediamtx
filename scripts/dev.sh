#!/bin/bash

# =============================================================================
# STREAMINGPRO - SCRIPT DE DESARROLLO
# =============================================================================
# Este script inicia el entorno de desarrollo con Docker Compose
# =============================================================================

set -e

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 StreamingPro - Iniciando entorno de desarrollo...${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.dev.yml" ]; then
    echo -e "${YELLOW}⚠️ Error: docker-compose.dev.yml no encontrado${NC}"
    echo "Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Verificar si existe archivo de entorno para desarrollo
if [ ! -f ".env.development" ]; then
    echo -e "${YELLOW}⚠️ Archivo .env.development no encontrado${NC}"
    echo "Creando desde template..."
    
    if [ -f "env.development.template" ]; then
        cp env.development.template .env.development
        echo -e "${GREEN}✅ Archivo .env.development creado desde template${NC}"
    else
        echo -e "${YELLOW}⚠️ No se encontró env.development.template${NC}"
        echo "Continuando con variables por defecto..."
    fi
fi

# Parar servicios existentes si los hay
echo -e "${BLUE}🛑 Parando servicios existentes...${NC}"
docker-compose -f docker-compose.dev.yml --env-file .env.development down --remove-orphans 2>/dev/null || true

# Construir imágenes
echo -e "${BLUE}🏗️ Construyendo imágenes...${NC}"
docker-compose -f docker-compose.dev.yml --env-file .env.development build

# Levantar servicios
echo -e "${BLUE}🚀 Levantando servicios...${NC}"
docker-compose -f docker-compose.dev.yml --env-file .env.development up -d

# Mostrar logs por unos segundos
echo -e "${BLUE}📋 Mostrando logs iniciales...${NC}"
sleep 3
docker-compose -f docker-compose.dev.yml --env-file .env.development logs --tail=20

echo ""
echo -e "${GREEN}✅ Entorno de desarrollo iniciado${NC}"
echo ""
echo "🌐 URLs de acceso:"
echo "   Frontend:  http://localhost:3001"
echo "   Backend:   http://localhost:3000"
echo "   Postgres:  localhost:5432"
echo ""
echo "📡 Puertos de streaming:"
echo "   SRT:       localhost:8890"
echo "   RTMP:      localhost:1935"
echo "   HLS:       http://localhost:8888"
echo ""
echo "🔧 Comandos útiles:"
echo "   Ver logs:         docker-compose -f docker-compose.dev.yml logs -f"
echo "   Parar servicios:  docker-compose -f docker-compose.dev.yml down"
echo "   Reiniciar:        ./scripts/dev.sh"
echo "" 