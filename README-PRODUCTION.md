# 🚀 StreamingPro - Guía de Producción Beta

Esta guía te ayudará a desplegar StreamingPro en un servidor de producción para pruebas reales.

## 📋 Requisitos del Servidor

### Hardware Mínimo
- **CPU**: 2 cores (4+ recomendado)
- **RAM**: 4GB (8GB+ recomendado)
- **Almacenamiento**: 20GB disponibles
- **Red**: Conexión estable con IPs estáticas

### Software
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **Docker**: 24.0+
- **Docker Compose**: 2.20+
- **Firewall**: Configurado según puertos necesarios

## 🌐 Configuración de Red

### Puertos que debe abrir tu servidor:

#### **Aplicación Web**
- `80/tcp` - HTTP (redirección a HTTPS)
- `443/tcp` - HTTPS (si usas SSL)
- `3000/tcp` - Frontend/Backend (si no usas proxy)

#### **Streaming Protocols**
- `8890/udp` - **SRT** (Puerto principal)
- `1935/tcp` - **RTMP** (OBS, encoders)
- `8554/tcp` - **RTSP** 
- `8000/udp` - **RTSP UDP RTP**
- `8001/udp` - **RTSP UDP RTCP**
- `8888/tcp` - **HLS**
- `8889/tcp` - **WebRTC HTTP**
- `8189/udp` - **WebRTC ICE**

#### **Opcional (administración)**
- `9997/tcp` - MediaMTX API (restringir acceso)
- `9998/tcp` - Métricas
- `22/tcp` - SSH

### Configuración de Firewall (Ubuntu/Debian)

```bash
# Habilitar firewall
sudo ufw enable

# Aplicación web
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp

# Streaming
sudo ufw allow 8890/udp  # SRT
sudo ufw allow 1935/tcp  # RTMP
sudo ufw allow 8554/tcp  # RTSP
sudo ufw allow 8000/udp  # RTSP UDP
sudo ufw allow 8001/udp  # RTSP UDP
sudo ufw allow 8888/tcp  # HLS
sudo ufw allow 8889/tcp  # WebRTC
sudo ufw allow 8189/udp  # WebRTC

# SSH (cambiar por tu puerto si es diferente)
sudo ufw allow 22/tcp

# Ver estado
sudo ufw status
```

## 🛠️ Preparación del Servidor

### 1. Instalar Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Logout y login de nuevo para aplicar cambios
logout
```

### 2. Clonar el Proyecto

```bash
git clone https://github.com/tu-usuario/streamingpro-restreamer.git
cd streamingpro-restreamer
```

### 3. Configurar Variables de Entorno

```bash
# Copiar template y editarlo
cp env.production.template .env.production
nano .env.production
```

#### **Configuración según tu servidor:**

**Para servidor con dominio:**
```bash
SERVER_HOST=streaming.midominio.com
NEXT_PUBLIC_API_URL=https://streaming.midominio.com/api
NEXT_PUBLIC_HLS_BASE_URL=https://streaming.midominio.com:8888
CORS_ORIGIN=https://streaming.midominio.com
```

**Para servidor solo con IP:**
```bash
SERVER_HOST=1.2.3.4
NEXT_PUBLIC_API_URL=http://1.2.3.4:3000/api
NEXT_PUBLIC_HLS_BASE_URL=http://1.2.3.4:8888
CORS_ORIGIN=http://1.2.3.4:3000
```

**⚠️ IMPORTANTE**: Cambia todas las passwords por valores seguros:
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `MEDIAMTX_API_PASSWORD`

## 🚀 Deployment

### Opción 1: Script Automático (Recomendado)

```bash
# Ejecutar script interactivo
./scripts/deploy-prod.sh

# Seleccionar opción 1: "Deployment completo (nuevo)"
```

### Opción 2: Manual

```bash
# Construir imágenes
docker-compose -f docker-compose.prod.yml --env-file .env.production build

# Levantar servicios
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Ejecutar migraciones
docker-compose -f docker-compose.prod.yml --env-file .env.production exec backend pnpm prisma migrate deploy

# Verificar estado
docker-compose -f docker-compose.prod.yml --env-file .env.production ps
```

## 🔍 Verificación Post-Deployment

### 1. Verificar Servicios

```bash
# Ver estado de contenedores
docker ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Health checks
curl http://localhost:3000/health  # Backend
curl http://localhost:9997/v3/config/global/get  # MediaMTX
```

### 2. Probar Acceso Web

Abre en tu navegador:
- `http://TU_IP:3000` - Frontend
- `http://TU_IP:3000/api` - Backend API

### 3. Probar Streaming SRT

Desde OBS o FFmpeg:
```bash
# URL SRT (cambiar TU_IP y STREAM_ID)
srt://TU_IP:8890?streamid=publish:STREAM_ID&pkt_size=1316
```

## 📱 URLs de Streaming para Clientes

### **Para OBS Studio:**
```
Servicio: Custom
Servidor: srt://TU_IP:8890?streamid=publish:TU_STREAM_ID&pkt_size=1316
```

### **Para FFmpeg:**
```bash
ffmpeg -i input.mp4 -c copy -f mpegts "srt://TU_IP:8890?streamid=publish:TU_STREAM_ID&pkt_size=1316"
```

### **RTMP (alternativo):**
```
rtmp://TU_IP:1935/live/TU_STREAM_KEY
```

## 🔧 Administración

### Comandos Útiles

```bash
# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f

# Reiniciar servicios
docker-compose -f docker-compose.prod.yml restart

# Parar todo
docker-compose -f docker-compose.prod.yml down

# Backup de base de datos
docker exec streamingpro_postgres_prod pg_dump -U streamingpro_user streamingpro_production > backup.sql

# Restaurar backup
docker exec -i streamingpro_postgres_prod psql -U streamingpro_user streamingpro_production < backup.sql

# Ver uso de recursos
docker stats

# Limpiar imágenes no usadas
docker system prune -f
```

### Actualizar Aplicación

```bash
# Opción 1: Script automático
./scripts/deploy-prod.sh
# Seleccionar opción 2: "Actualizar aplicación"

# Opción 2: Manual
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d --no-deps backend frontend mediamtx
```

## 🛡️ Seguridad en Producción

### 1. SSL/HTTPS (Recomendado)

Para habilitar HTTPS, necesitas:
1. Certificado SSL (Let's Encrypt recomendado)
2. Configurar Nginx como proxy reverso
3. Actualizar variables de entorno con URLs HTTPS

### 2. Firewall

- Cierra puertos no necesarios
- Restringe acceso SSH solo a IPs conocidas
- Considera VPN para administración

### 3. Monitoreo

```bash
# Ver métricas de MediaMTX
curl http://localhost:9998/metrics

# Logs importantes
docker-compose -f docker-compose.prod.yml logs backend | grep ERROR
docker-compose -f docker-compose.prod.yml logs mediamtx | grep ERROR
```

## 🐛 Troubleshooting

### Problema: Contenedores no inician

```bash
# Ver logs detallados
docker-compose -f docker-compose.prod.yml logs

# Verificar puertos ocupados
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :8890

# Verificar permisos Docker
sudo usermod -aG docker $USER
```

### Problema: SRT no conecta desde externo

1. Verificar firewall del servidor
2. Verificar que la IP en variables de entorno es correcta
3. Probar conectividad UDP: `nc -zuv TU_IP 8890`
4. Verificar que se incluye `pkt_size=1316` en la URL SRT

### Problema: Frontend no carga

1. Verificar variables `NEXT_PUBLIC_*` en `.env.production`
2. Verificar que backend está respondiendo
3. Verificar CORS_ORIGIN incluye tu dominio/IP

### Problema: Base de datos no conecta

```bash
# Verificar estado de PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Conectar manualmente
docker-compose -f docker-compose.prod.yml exec postgres psql -U streamingpro_user streamingpro_production
```

## 📊 Monitoreo y Métricas

### Logs Importantes

```bash
# Backend API
docker-compose -f docker-compose.prod.yml logs backend

# MediaMTX streaming
docker-compose -f docker-compose.prod.yml logs mediamtx

# Base de datos
docker-compose -f docker-compose.prod.yml logs postgres
```

### Métricas de Rendimiento

```bash
# Uso de recursos
docker stats

# Métricas de MediaMTX (Prometheus format)
curl http://localhost:9998/metrics

# Estado de streams activos
curl -u admin:TU_PASSWORD http://localhost:9997/v3/paths/list
```

## 📞 Soporte

Si encuentras problemas:

1. **Revisar logs**: `docker-compose -f docker-compose.prod.yml logs`
2. **Verificar configuración**: Asegurar que `.env.production` esté correcto
3. **Verificar red**: Firewall, puertos, conectividad
4. **Verificar recursos**: CPU, RAM, espacio en disco

---

## 🎉 ¡Listo para Producción!

Una vez completados estos pasos, tendrás StreamingPro funcionando en producción, listo para:

- ✅ Recibir streams SRT/RTMP desde cualquier encoder
- ✅ Distribuir via HLS/WebRTC a navegadores
- ✅ Gestionar múltiples streams simultáneos
- ✅ Monitoreo en tiempo real
- ✅ Administración via web interface

**URLs de prueba:**
- **Web App**: `http://TU_IP:3000`
- **SRT**: `srt://TU_IP:8890?streamid=publish:test&pkt_size=1316`
- **RTMP**: `rtmp://TU_IP:1935/live/test` 