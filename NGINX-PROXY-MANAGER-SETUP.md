# 🚀 StreamingPro + Nginx Proxy Manager

Guía específica para configurar StreamingPro en servidor Hetzner con **Nginx Proxy Manager existente**.

## 🎯 **Ventajas de usar Nginx Proxy Manager**

- ✅ **SSL automático** con Let's Encrypt
- ✅ **Interfaz web** para gestión de dominios
- ✅ **Configuración simplificada**
- ✅ **Gestión centralizada** de todos tus servicios
- ✅ **Sin configuración manual** de certificados

## 🔧 **Configuración de Servicios**

Con Nginx Proxy Manager, StreamingPro expone estos puertos internos:

| Servicio | Puerto Host | Puerto Interno | Descripción |
|----------|-------------|----------------|-------------|
| **Frontend** | `3001` | `3000` | Interfaz web Next.js |
| **Backend** | `3000` | `3000` | API NestJS + WebSockets |
| **HLS** | `8888` | `8888` | Streaming HLS |
| **SRT** | `8890/udp` | `8890/udp` | Streaming SRT ⭐ |
| **RTMP** | `1935` | `1935` | Streaming RTMP |
| **WebRTC** | `8889` | `8889` | WebRTC HTTP |

## 📝 **1. Configurar Variables de Entorno**

Crear `.env.production` desde el template:

```bash
cp env.production.template .env.production
nano .env.production
```

### **Configuración específica para tu setup:**

```bash
# =============================================================================
# SERVIDOR HETZNER DEDICADO
# =============================================================================
SERVER_HOST=central.streamingpro.es
SERVER_IP=TU_IP_PUBLICA_HETZNER

# =============================================================================
# BASE DE DATOS
# =============================================================================
POSTGRES_USER=streamingpro_user
POSTGRES_PASSWORD=TU_PASSWORD_SEGURA_123!
POSTGRES_DB=streamingpro_production

# =============================================================================
# SEGURIDAD
# =============================================================================
JWT_SECRET=TU_JWT_SECRET_MUY_LARGO_Y_SEGURO_789!
MEDIAMTX_API_PASSWORD=TU_MEDIAMTX_PASSWORD_456!

# =============================================================================
# URLs PÚBLICAS (configuradas por Nginx Proxy Manager)
# =============================================================================
CORS_ORIGIN=https://central.streamingpro.es

NEXT_PUBLIC_API_URL=https://central.streamingpro.es/api
NEXT_PUBLIC_WEBSOCKET_URL=wss://central.streamingpro.es/api
NEXT_PUBLIC_HLS_BASE_URL=https://central.streamingpro.es/hls

# =============================================================================
# CONFIGURACIÓN MEDIAMTX
# =============================================================================
MEDIAMTX_API_USER=admin
MEDIAMTX_LOG_LEVEL=info
MEDIAMTX_HLS_BASE_URL=http://mediamtx:8888
WEBRTC_ADDITIONAL_HOSTS=TU_IP_PUBLICA_HETZNER,central.streamingpro.es
```

## 🚀 **2. Deployment de StreamingPro**

```bash
# Ejecutar deployment
./scripts/deploy-prod.sh

# Seleccionar opción 1: "Deployment completo (nuevo)"
```

## 🌐 **3. Configuración en Nginx Proxy Manager**

### **A. Proxy Host Principal (Frontend + API)**

En tu interfaz de Nginx Proxy Manager, crear un **Proxy Host**:

#### **Details:**
- **Domain Names**: `central.streamingpro.es`
- **Scheme**: `http`
- **Forward Hostname/IP**: `localhost` (o la IP interna del servidor)
- **Forward Port**: `3002` ⭐ (Frontend)
- **Cache Assets**: ✅ Activado
- **Block Common Exploits**: ✅ Activado
- **Websockets Support**: ✅ Activado (importante para Socket.IO)

#### **SSL:**
- **SSL Certificate**: Seleccionar "Request a new SSL Certificate"
- **Force SSL**: ✅ Activado
- **HTTP/2 Support**: ✅ Activado
- **HSTS Enabled**: ✅ Activado (opcional)

#### **Advanced (Configuración personalizada):**

```nginx
# Configuración para API y WebSockets
location /api/ {
            proxy_pass http://localhost:3000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Timeouts para API
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}

# WebSockets (Socket.IO)
location /socket.io/ {
            proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts largos para WebSockets
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 86400s;
}

# HLS Streaming
location /hls/ {
    proxy_pass http://localhost:8888/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Headers CORS para HLS
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;
    add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
    
    # Caching optimizado para HLS
    location ~* \.m3u8$ {
        expires -1;
        add_header 'Cache-Control' 'no-cache, no-store, must-revalidate';
    }
    
    location ~* \.ts$ {
        expires 1h;
        add_header 'Cache-Control' 'public, max-age=3600';
    }
    
    # Timeouts para streaming
    proxy_connect_timeout 5s;
    proxy_send_timeout 5s;
    proxy_read_timeout 10s;
}
```

## 🔍 **4. Verificación Post-Deployment**

### **Verificar servicios internos:**
```bash
# Ver estado de contenedores
docker ps

# Verificar backend
curl http://localhost:3000/health

# Verificar frontend  
curl http://localhost:3002

# Verificar MediaMTX
curl http://localhost:9997/v3/config/global/get
```

### **Verificar URLs públicas:**
- ✅ **Web App**: `https://central.streamingpro.es`
- ✅ **API**: `https://central.streamingpro.es/api`
- ✅ **HLS**: `https://central.streamingpro.es/hls`

## 📡 **5. URLs de Streaming para Clientes**

### **SRT (Protocolo Principal):**
```
srt://TU_IP_HETZNER:8890?streamid=publish:TU_STREAM_ID&pkt_size=1316&latency=200
```

### **RTMP (Alternativo):**
```
rtmp://TU_IP_HETZNER:1935/live/TU_STREAM_KEY
```

### **HLS (Visualización):**
```
https://central.streamingpro.es/hls/TU_STREAM_ID/index.m3u8
```

## 🛡️ **6. Seguridad Mejorada**

Con esta configuración:

✅ **API MediaMTX** solo accesible desde localhost (`127.0.0.1:9997`)
✅ **Métricas** solo accesibles desde localhost (`127.0.0.1:9998`)  
✅ **SSL automático** gestionado por Nginx Proxy Manager
✅ **CORS configurado** correctamente
✅ **Headers de seguridad** aplicados automáticamente

## 🔧 **7. Gestión y Administración**

### **Comandos útiles:**
```bash
# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f

# Reiniciar servicios
docker-compose -f docker-compose.prod.yml restart

# Ver estadísticas de uso
docker stats

# Backup base de datos
docker exec streamingpro_postgres_prod pg_dump -U streamingpro_user streamingpro_production > backup_$(date +%Y%m%d).sql
```

### **Monitoreo desde Nginx Proxy Manager:**
- Ver logs de acceso en tiempo real
- Estadísticas de tráfico
- Gestión automática de certificados SSL
- Renovación automática (cada 60 días)

## 🎯 **Estimación de Rendimiento**

Con tu servidor **Hetzner i5-13500, 64GB RAM** y esta configuración optimizada:

- ✅ **6 entradas SRT/RTMP**: Sin problema
- ✅ **18 salidas HLS**: Perfecto rendimiento  
- ✅ **23+ viewers simultáneos**: Capacidad sobrada
- ✅ **Escalabilidad**: Puede manejar 2-3x más carga

## 🎉 **¡Listo para Producción!**

Esta configuración te da:

- 🔒 **HTTPS automático** con Nginx Proxy Manager
- 📡 **SRT de alta calidad** en puerto 8890
- 🎥 **HLS de baja latencia** via HTTPS
- 📱 **Interfaz web moderna** y responsive
- 🔧 **Administración simplificada**
- 📊 **Monitoreo integrado**

**URLs finales:**
- **App**: `https://central.streamingpro.es`
- **SRT**: `srt://TU_IP_HETZNER:8890?streamid=publish:test&pkt_size=1316` 