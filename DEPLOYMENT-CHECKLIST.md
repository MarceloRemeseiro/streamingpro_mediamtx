# ✅ StreamingPro - Checklist de Deployment

Lista de verificación rápida para asegurar un deployment exitoso en producción.

## 🏗️ **Pre-Deployment**

### **Servidor**
- [ ] Servidor con recursos mínimos (2 CPU, 4GB RAM, 20GB storage)
- [ ] Ubuntu/Debian/CentOS actualizado
- [ ] Docker 24.0+ instalado
- [ ] Docker Compose 2.20+ instalado
- [ ] Usuario con permisos de Docker (`usermod -aG docker $USER`)

### **Red y Firewall (con Nginx Proxy Manager)**
- [ ] Nginx Proxy Manager funcionando correctamente
- [ ] Puertos abiertos en firewall:
  - [ ] `80/tcp` + `443/tcp` - Ya gestionados por Nginx Proxy Manager
  - [ ] `8890/udp` - SRT ⭐ (más importante)
  - [ ] `1935/tcp` - RTMP
  - [ ] `8888/tcp` - HLS (proxy interno)
  - [ ] `8889/tcp` - WebRTC
  - [ ] `8189/udp` - WebRTC ICE
  - [ ] `8002/udp` - RTSP UDP RTP (cambio para evitar conflicto con Portainer)
- [ ] IP pública del servidor conocida
- [ ] Conectividad UDP verificada (`nc -zuv TU_IP 8890`)
- [ ] Dominio `central.streamingpro.es` apunta a la IP del servidor

### **Código y Configuración**
- [ ] Proyecto clonado en servidor
- [ ] Archivo `.env.production` creado desde template
- [ ] Variables de entorno configuradas:
  - [ ] `SERVER_HOST` / `SERVER_IP` correctos
  - [ ] `POSTGRES_PASSWORD` cambiado
  - [ ] `JWT_SECRET` cambiado (mínimo 32 caracteres)
  - [ ] `MEDIAMTX_API_PASSWORD` cambiado
  - [ ] URLs `NEXT_PUBLIC_*` correctas
  - [ ] `CORS_ORIGIN` incluye tu dominio/IP

## 🚀 **Deployment**

### **Construcción y Lanzamiento**
- [ ] Script de deployment ejecutable (`chmod +x scripts/deploy-prod.sh`)
- [ ] Ejecutar deployment: `./scripts/deploy-prod.sh` → Opción 1
- [ ] O manual: `docker-compose -f docker-compose.prod.yml --env-file .env.production up -d`
- [ ] Migraciones ejecutadas correctamente
- [ ] Todos los contenedores en estado `Up`

### **Verificación de Servicios**
- [ ] PostgreSQL funcionando (`docker ps | grep postgres`)
- [ ] Backend respondiendo (`curl http://localhost:3000/health`)
- [ ] MediaMTX funcionando (`curl http://localhost:9997/v3/config/global/get`)
- [ ] Frontend accesible en navegador

## 🔍 **Post-Deployment**

### **Verificación Web**
- [ ] Frontend carga correctamente: `https://central.streamingpro.es`
- [ ] Puede crear entradas SRT/RTMP
- [ ] Interfaz responde sin errores JavaScript
- [ ] WebSockets conectando (estados LED funcionan)
- [ ] SSL funcionando correctamente (certificado válido)

### **Verificación de Streaming**
- [ ] **SRT Test**: Conectar desde OBS con `srt://TU_IP:8890?streamid=publish:test&pkt_size=1316`
- [ ] **RTMP Test**: Conectar con `rtmp://TU_IP:1935/live/test`
- [ ] Stream aparece en interfaz web
- [ ] HLS player funciona
- [ ] LED indica estado correcto (verde = conectado)

### **Verificación de Logs**
- [ ] No hay errores críticos en logs: `docker-compose -f docker-compose.prod.yml logs`
- [ ] MediaMTX registra conexiones SRT/RTMP
- [ ] Backend API responde sin errores 500

## 🌐 **URLs para Testing**

### **Para OBS Studio:**
```
Servicio: Custom
Servidor: srt://TU_IP:8890?streamid=publish:TU_STREAM_ID&pkt_size=1316&latency=200
```

### **Para FFmpeg:**
```bash
ffmpeg -f lavfi -i testsrc=size=640x480:rate=25 -c:v libx264 -preset ultrafast -b:v 1000k -f mpegts "srt://TU_IP:8890?streamid=publish:test&pkt_size=1316" -t 30
```

### **Verificar URLs:**
- **Frontend**: `https://central.streamingpro.es`
- **Backend API**: `https://central.streamingpro.es/api`
- **HLS Base**: `https://central.streamingpro.es/hls`
- **MediaMTX API**: `http://localhost:9997/v3/paths/list` (solo localhost)

## 🐛 **Troubleshooting Común**

### **❌ Contenedores no inician**
```bash
# Ver logs específicos
docker-compose -f docker-compose.prod.yml logs SERVICIO

# Verificar puertos ocupados
sudo netstat -tulpn | grep -E ':(3000|3001)'
sudo lsof -i :8890
```

### **❌ SRT no conecta desde externo**
1. [ ] Verificar firewall: `sudo ufw status`
2. [ ] Probar UDP: `nc -zuv TU_IP 8890`
3. [ ] Verificar formato URL: debe incluir `&pkt_size=1316`
4. [ ] Revisar logs MediaMTX: `docker logs streamingpro_mediamtx_prod`

### **❌ Frontend no carga**
1. [ ] Verificar variable `NEXT_PUBLIC_API_URL` en `.env.production`
2. [ ] Verificar `CORS_ORIGIN` incluye tu IP/dominio
3. [ ] Verificar backend responde: `curl http://localhost:3000/health`

### **❌ Base de datos no conecta**
```bash
# Verificar PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U streamingpro_user

# Ver logs de conexión
docker-compose -f docker-compose.prod.yml logs postgres backend
```

## 🔧 **Comandos de Administración**

```bash
# Ver estado de servicios
docker-compose -f docker-compose.prod.yml ps

# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f

# Reiniciar servicios
docker-compose -f docker-compose.prod.yml restart

# Backup base de datos
docker exec streamingpro_postgres_prod pg_dump -U streamingpro_user streamingpro_production > backup_$(date +%Y%m%d).sql

# Ver uso de recursos
docker stats

# Parar todo
docker-compose -f docker-compose.prod.yml down
```

## 📋 **Información Post-Deployment**

Una vez completado exitosamente:

### **URLs de Acceso:**
- **App Web**: `https://central.streamingpro.es`
- **SRT**: `srt://TU_IP_HETZNER:8890?streamid=publish:STREAM_ID&pkt_size=1316`
- **RTMP**: `rtmp://TU_IP_HETZNER:1935/live/STREAM_KEY`
- **HLS**: `https://central.streamingpro.es/hls/STREAM_ID/index.m3u8`

### **Credenciales de Administración:**
- **MediaMTX API**: `admin` / `[tu_password_configurado]`
- **PostgreSQL**: `streamingpro_user` / `[tu_password_configurado]`

### **Archivos Importantes:**
- **Configuración**: `.env.production`
- **Logs**: `docker-compose -f docker-compose.prod.yml logs`
- **Backups**: `./backups/`

---

## ✅ **¡Deployment Completado!**

Si todos los checkboxes están marcados, tu StreamingPro está listo para producción beta y puede recibir streams reales desde cualquier parte del mundo.

**🎯 Próximos pasos:**
1. Configurar dominio y SSL si es necesario
2. Configurar monitoreo y alertas
3. Realizar pruebas de carga
4. Configurar backups automáticos 