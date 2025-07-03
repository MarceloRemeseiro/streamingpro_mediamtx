#!/bin/bash

# =============================================================================
# StreamingPro - Verificación de Configuración de Producción
# =============================================================================
# Este script verifica que todos los archivos y configuraciones estén 
# listos para desplegarse en producción
# =============================================================================

echo "🔍 Verificando configuración de producción para StreamingPro..."

# Colors para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de errores
ERRORS=0

# Función para mostrar errores
show_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ERRORS=$((ERRORS + 1))
}

# Función para mostrar warnings
show_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

# Función para mostrar éxito
show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo ""
echo "=== 1. Verificando archivos de configuración ===" 

# Verificar que exista .env.production
if [ ! -f ".env.production" ]; then
    show_error ".env.production no existe. Copia env.production.READY como .env.production"
else
    show_success "Archivo .env.production encontrado"
fi

# Verificar docker-compose.prod.yml
if [ ! -f "docker-compose.prod.yml" ]; then
    show_error "docker-compose.prod.yml no existe"
else
    show_success "Archivo docker-compose.prod.yml encontrado"
fi

# Verificar mediamtx.prod.yml
if [ ! -f "docker/mediamtx/mediamtx.prod.yml" ]; then
    show_error "docker/mediamtx/mediamtx.prod.yml no existe"
else
    show_success "Archivo mediamtx.prod.yml encontrado"
fi

echo ""
echo "=== 2. Verificando variables de entorno críticas ===" 

if [ -f ".env.production" ]; then
    # Verificar variables críticas
    source .env.production
    
    if [ -z "$POSTGRES_USER" ]; then
        show_error "POSTGRES_USER no está definida"
    else
        show_success "POSTGRES_USER definida"
    fi
    
    if [ -z "$POSTGRES_PASSWORD" ]; then
        show_error "POSTGRES_PASSWORD no está definida"
    else
        show_success "POSTGRES_PASSWORD definida"
    fi
    
    if [ -z "$POSTGRES_DB" ]; then
        show_error "POSTGRES_DB no está definida"
    else
        show_success "POSTGRES_DB definida"
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        show_error "JWT_SECRET no está definida"
    else
        show_success "JWT_SECRET definida"
    fi
    
    if [ -z "$SERVER_IP" ]; then
        show_error "SERVER_IP no está definida"
    else
        show_success "SERVER_IP definida: $SERVER_IP"
    fi
    
    if [ -z "$MTX_CONN_TYPE" ]; then
        show_error "MTX_CONN_TYPE no está definida"
    else
        show_success "MTX_CONN_TYPE definida: $MTX_CONN_TYPE"
    fi
    
    if [ -z "$MTX_CONN_ID" ]; then
        show_error "MTX_CONN_ID no está definida"
    else
        show_success "MTX_CONN_ID definida: $MTX_CONN_ID"
    fi
fi

echo ""
echo "=== 3. Verificando configuración de puertos ===" 

# Verificar que los puertos no estén en conflicto
if [ -f "docker-compose.prod.yml" ]; then
    # Verificar puerto RTSP UDP RTP (debe ser 8002, no 8000)
    if grep -q "8000:8000/udp" docker-compose.prod.yml; then
        show_error "Puerto 8000 UDP en uso - conflicto con Portainer. Debe ser 8002:8000/udp"
    elif grep -q "8002:8000/udp" docker-compose.prod.yml; then
        show_success "Puerto RTSP UDP RTP correctamente configurado (8002:8000/udp)"
    else
        show_warning "No se encuentra configuración de puerto RTSP UDP RTP"
    fi
fi

echo ""
echo "=== 4. Verificando configuración de base de datos ===" 

# Verificar que la configuración de database.config.ts esté usando configuración directa
if [ -f "apps/backend/src/config/database.config.ts" ]; then
    if grep -q "host: 'postgres'" apps/backend/src/config/database.config.ts; then
        show_success "Configuración de base de datos usando host directo"
    else
        show_warning "Verificar configuración de host de base de datos"
    fi
    
    if grep -q "ssl: false" apps/backend/src/config/database.config.ts; then
        show_success "SSL correctamente deshabilitado"
    else
        show_error "SSL no está deshabilitado - puede causar errores de conexión"
    fi
fi

echo ""
echo "=== 5. Verificando health checks ===" 

# Verificar health check de backend
if grep -q "nc -z localhost 3000" docker-compose.prod.yml; then
    show_success "Health check de backend configurado correctamente"
else
    show_warning "Health check de backend puede necesitar ajustes"
fi

# Verificar health check de MediaMTX
if grep -q "nc -z localhost 9997" docker-compose.prod.yml; then
    show_success "Health check de MediaMTX configurado correctamente"
else
    show_error "Health check de MediaMTX no está configurado correctamente"
fi

echo ""
echo "=== 6. Verificando endpoint de health en el backend ===" 

if grep -q "@Get('health')" apps/backend/src/app.module.ts; then
    show_success "Endpoint /health configurado en el backend"
else
    show_error "Endpoint /health no encontrado en el backend"
fi

echo ""
echo "=== RESUMEN ===" 

if [ $ERRORS -eq 0 ]; then
    show_success "✨ Todo listo para producción! Sin errores encontrados."
    echo ""
    echo "🚀 Comandos para deploy:"
    echo "  1. Copiar archivos: scp -r . usuario@85.10.196.133:/path/to/project"
    echo "  2. En el servidor:"
    echo "     - cp env.production.READY .env.production"
    echo "     - docker-compose -f docker-compose.prod.yml --env-file .env.production down"
    echo "     - docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache"
    echo "     - docker-compose -f docker-compose.prod.yml --env-file .env.production up -d"
else
    show_error "❌ Encontrados $ERRORS errores. Corrígelos antes de hacer deploy."
    exit 1
fi

echo "" 