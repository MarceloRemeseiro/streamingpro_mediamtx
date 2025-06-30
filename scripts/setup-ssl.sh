#!/bin/bash

# =============================================================================
# STREAMINGPRO - CONFIGURACIÓN SSL AUTOMÁTICA
# Script para configurar SSL con Let's Encrypt para central.streamingpro.es
# =============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

DOMAIN="central.streamingpro.es"
EMAIL=""  # Se pedirá al usuario
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# =============================================================================
# VERIFICACIONES
# =============================================================================

log "🔍 Verificando requisitos para SSL..."

# Verificar archivos necesarios
if [ ! -f "$COMPOSE_FILE" ]; then
    error "Archivo $COMPOSE_FILE no encontrado"
fi

if [ ! -f "$ENV_FILE" ]; then
    error "Archivo $ENV_FILE no encontrado. Ejecuta primero el deployment básico"
fi

# Verificar que Docker esté funcionando
if ! docker ps &> /dev/null; then
    error "Docker no está funcionando o no tienes permisos"
fi

# Verificar que el dominio apunte al servidor
log "🌐 Verificando DNS para $DOMAIN..."
CURRENT_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$DOMAIN_IP" != "$CURRENT_IP" ]; then
    warning "El dominio $DOMAIN apunta a $DOMAIN_IP pero tu servidor tiene IP $CURRENT_IP"
    echo ""
    echo "⚠️  IMPORTANTE: Antes de continuar, asegúrate de que:"
    echo "   1. El dominio $DOMAIN esté configurado en tu proveedor DNS"
    echo "   2. El registro A apunte a la IP de tu servidor: $CURRENT_IP"
    echo "   3. Los cambios DNS se hayan propagado (puede tomar hasta 24h)"
    echo ""
    read -p "¿Estás seguro de que el DNS está configurado correctamente? (y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        error "Configura el DNS primero y vuelve a ejecutar este script"
    fi
fi

success "Verificaciones completadas"

# =============================================================================
# OBTENER EMAIL
# =============================================================================

if [ -z "$EMAIL" ]; then
    echo ""
    echo "📧 Para obtener certificados SSL de Let's Encrypt necesitamos tu email:"
    echo "   - Se usará solo para notificaciones de vencimiento"
    echo "   - Let's Encrypt es gratuito y no envía spam"
    echo ""
    read -p "Introduce tu email: " EMAIL
    
    if [ -z "$EMAIL" ]; then
        error "Email es requerido para SSL"
    fi
fi

# =============================================================================
# FUNCIONES
# =============================================================================

prepare_nginx_for_ssl() {
    log "📝 Preparando configuración de Nginx para SSL..."
    
    # Crear directorio para certificados temporales
    mkdir -p ./docker/nginx/ssl-temp
    
    # Crear certificados auto-firmados temporales para que Nginx inicie
    log "🔐 Creando certificados temporales..."
    openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
        -keyout ./docker/nginx/ssl-temp/temp.key \
        -out ./docker/nginx/ssl-temp/temp.crt \
        -subj "/C=ES/ST=Madrid/L=Madrid/O=StreamingPro/CN=$DOMAIN" 2>/dev/null
    
    success "Certificados temporales creados"
}

start_nginx_for_challenge() {
    log "🚀 Iniciando Nginx temporalmente para challenge..."
    
    # Crear configuración temporal de Nginx solo para el challenge
    cat > ./docker/nginx/nginx.temp.conf << EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name $DOMAIN;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://\$server_name\$request_uri;
        }
    }
    
    server {
        listen 443 ssl;
        server_name $DOMAIN;
        
        ssl_certificate /etc/nginx/ssl-temp/temp.crt;
        ssl_certificate_key /etc/nginx/ssl-temp/temp.key;
        
        location / {
            return 503;
        }
    }
}
EOF

    # Iniciar Nginx temporal
    docker run -d --name nginx_temp \
        -p 80:80 -p 443:443 \
        -v $(pwd)/docker/nginx/nginx.temp.conf:/etc/nginx/nginx.conf:ro \
        -v $(pwd)/docker/nginx/ssl-temp:/etc/nginx/ssl-temp:ro \
        -v letsencrypt_www:/var/www/certbot \
        nginx:alpine
    
    sleep 5
    success "Nginx temporal iniciado"
}

obtain_ssl_certificate() {
    log "🔐 Obteniendo certificado SSL de Let's Encrypt..."
    
    # Obtener certificado
    docker run --rm \
        -v letsencrypt_certs:/etc/letsencrypt \
        -v letsencrypt_www:/var/www/certbot \
        certbot/certbot \
        certonly --webroot --webroot-path=/var/www/certbot \
        --email $EMAIL --agree-tos --no-eff-email \
        -d $DOMAIN
    
    success "Certificado SSL obtenido exitosamente"
}

stop_nginx_temp() {
    log "🛑 Parando Nginx temporal..."
    docker stop nginx_temp 2>/dev/null || true
    docker rm nginx_temp 2>/dev/null || true
    success "Nginx temporal removido"
}

update_environment() {
    log "📝 Actualizando variables de entorno para HTTPS..."
    
    # Actualizar .env.production para usar HTTPS
    sed -i 's|http://central.streamingpro.es|https://central.streamingpro.es|g' $ENV_FILE
    sed -i 's|ws://central.streamingpro.es|wss://central.streamingpro.es|g' $ENV_FILE
    
    success "Variables de entorno actualizadas"
}

start_production_services() {
    log "🚀 Iniciando servicios de producción con SSL..."
    
    # Limpiar configuración temporal
    rm -f ./docker/nginx/nginx.temp.conf
    rm -rf ./docker/nginx/ssl-temp
    
    # Iniciar servicios completos
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
    
    success "Servicios de producción iniciados"
}

setup_ssl_renewal() {
    log "🔄 Configurando renovación automática de SSL..."
    
    # Crear script de renovación
    cat > ./scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
# Renovar certificados SSL automáticamente

echo "$(date): Iniciando renovación SSL..." >> /var/log/ssl-renewal.log

# Renovar certificados
docker run --rm \
    -v letsencrypt_certs:/etc/letsencrypt \
    -v letsencrypt_www:/var/www/certbot \
    certbot/certbot renew

# Recargar Nginx si se renovó
if [ $? -eq 0 ]; then
    docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
    echo "$(date): SSL renovado exitosamente" >> /var/log/ssl-renewal.log
else
    echo "$(date): Error en renovación SSL" >> /var/log/ssl-renewal.log
fi
EOF

    chmod +x ./scripts/renew-ssl.sh
    
    success "Script de renovación creado en ./scripts/renew-ssl.sh"
    
    echo ""
    echo "📅 Para configurar renovación automática, agregar a crontab:"
    echo "   0 12 * * * /ruta/completa/al/proyecto/scripts/renew-ssl.sh"
    echo ""
}

verify_ssl() {
    log "🔍 Verificando configuración SSL..."
    
    sleep 10  # Esperar a que los servicios se inicialicen
    
    # Verificar que el sitio responda con HTTPS
    if curl -f -s https://$DOMAIN/nginx-health > /dev/null; then
        success "✅ HTTPS funcionando correctamente!"
        echo ""
        echo "🎉 SSL configurado exitosamente para $DOMAIN"
        echo ""
        echo "🌐 URLs disponibles:"
        echo "   Web App: https://$DOMAIN"
        echo "   API:     https://$DOMAIN/api"
        echo "   HLS:     https://$DOMAIN/hls"
        echo ""
    else
        warning "HTTPS no responde correctamente. Verificar logs:"
        echo "   docker-compose -f $COMPOSE_FILE logs nginx"
    fi
}

# =============================================================================
# FLUJO PRINCIPAL
# =============================================================================

main() {
    echo ""
    echo "🔐 StreamingPro - Configuración SSL Automática"
    echo "=============================================="
    echo ""
    echo "Dominio: $DOMAIN"
    echo "Email:   $EMAIL"
    echo ""
    
    read -p "¿Continuar con la configuración SSL? (y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        echo "Configuración SSL cancelada"
        exit 0
    fi
    
    # Parar servicios existentes
    log "🛑 Parando servicios existentes..."
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE down 2>/dev/null || true
    
    # Crear volúmenes necesarios
    docker volume create letsencrypt_certs 2>/dev/null || true
    docker volume create letsencrypt_www 2>/dev/null || true
    
    # Ejecutar pasos
    prepare_nginx_for_ssl
    start_nginx_for_challenge
    obtain_ssl_certificate
    stop_nginx_temp
    update_environment
    start_production_services
    setup_ssl_renewal
    verify_ssl
    
    echo ""
    echo "🎉 ¡Configuración SSL completada exitosamente!"
    echo ""
    echo "🔒 Tu aplicación ahora funciona con HTTPS seguro"
    echo "📱 Recuerda actualizar las URLs de streaming en tus clientes:"
    echo "   - Frontend: https://$DOMAIN"
    echo "   - HLS:      https://$DOMAIN/hls/STREAM_ID/index.m3u8"
    echo "   - SRT:      srt://TU_IP:8890?streamid=publish:STREAM_ID&pkt_size=1316"
    echo ""
    echo "🔄 Renovación automática configurada en ./scripts/renew-ssl.sh"
    echo ""
}

# Ejecutar si es llamado directamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 