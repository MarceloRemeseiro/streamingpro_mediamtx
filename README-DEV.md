# StreamingPro - Entorno de Desarrollo

Este documento explica cómo configurar y usar el entorno de desarrollo de StreamingPro con **hot-reload completo** sin necesidad de rebuilds constantes.

## 🚀 Inicio Rápido

```bash
# Iniciar todo el entorno de desarrollo
./scripts/dev.sh start

# Ver logs en tiempo real
./scripts/dev.sh logs

# Parar todos los servicios
./scripts/dev.sh stop
```

## 📋 Requisitos

- Docker y Docker Compose
- Node.js 22+ (para desarrollo local opcional)
- Bash (para el script de gestión)

## 🏗️ Arquitectura de Desarrollo

El entorno de desarrollo incluye:

- **Backend NestJS** (Puerto 3000) - Con hot-reload via nodemon
- **Frontend Next.js** (Puerto 3001) - Con hot-reload nativo de Next.js
- **MediaMTX** (Puertos 8554, 1935, 8888, 8889, 9997) - Con configuración de desarrollo
- **PostgreSQL** (Puerto 5432) - Base de datos principal
- **PostgreSQL Test** (Puerto 5433) - Base de datos para tests

## 🔧 Comandos Disponibles

### Gestión de Servicios
```bash
./scripts/dev.sh start       # Iniciar todos los servicios
./scripts/dev.sh stop        # Parar todos los servicios
./scripts/dev.sh restart     # Reiniciar todos los servicios
./scripts/dev.sh status      # Ver estado de los servicios
```

### Logs y Debugging
```bash
./scripts/dev.sh logs              # Ver todos los logs
./scripts/dev.sh logs backend      # Ver logs del backend
./scripts/dev.sh logs frontend     # Ver logs del frontend
./scripts/dev.sh logs mediamtx     # Ver logs de MediaMTX
./scripts/dev.sh logs postgres     # Ver logs de PostgreSQL
```

### Acceso a Contenedores
```bash
./scripts/dev.sh shell backend     # Abrir shell en el backend
./scripts/dev.sh shell frontend    # Abrir shell en el frontend
./scripts/dev.sh shell mediamtx    # Abrir shell en MediaMTX
```

### Base de Datos
```bash
./scripts/dev.sh db-migrate        # Ejecutar migraciones
./scripts/dev.sh db-reset          # Resetear base de datos
```

### Testing
```bash
./scripts/dev.sh test              # Ejecutar tests
```

### Mantenimiento
```bash
./scripts/dev.sh build             # Construir imágenes de desarrollo
./scripts/dev.sh clean             # Limpiar volúmenes y contenedores
```

## 🌐 URLs de Desarrollo

Una vez iniciados los servicios, estarán disponibles en:

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **MediaMTX API**: http://localhost:9997
- **MediaMTX HLS**: http://localhost:8888
- **MediaMTX WebRTC**: http://localhost:8889
- **PostgreSQL**: localhost:5432
- **PostgreSQL Test**: localhost:5433

## ⚡ Hot-Reload

### Backend (NestJS)
- **Tecnología**: Nodemon + TypeScript watch mode
- **Trigger**: Cualquier cambio en archivos `.ts` en `apps/backend/`
- **Tiempo**: ~2-3 segundos para recompilar y reiniciar

### Frontend (Next.js)
- **Tecnología**: Next.js Fast Refresh
- **Trigger**: Cualquier cambio en archivos `.tsx`, `.ts`, `.css` en `apps/frontend/`
- **Tiempo**: ~500ms para hot-reload

### MediaMTX
- **Configuración**: Bind mount de `docker/mediamtx/mediamtx_dev.yml`
- **Reload**: Reinicia automáticamente al cambiar configuración
- **Logs**: Disponibles en `logs/mediamtx/`

## 📁 Estructura de Bind Mounts

```
apps/backend/          → /app (en contenedor backend)
apps/frontend/         → /app (en contenedor frontend)
docker/mediamtx/       → /mediamtx.yml (en contenedor mediamtx)
logs/                  → Logs persistentes en host
```

## 🔍 Debugging

### Backend
```bash
# Conectar debugger en puerto 9229
./scripts/dev.sh logs backend

# Abrir shell para debugging manual
./scripts/dev.sh shell backend
pnpm run start:debug
```

### Frontend
```bash
# Ver logs de Next.js
./scripts/dev.sh logs frontend

# Debugging en browser
# Abrir http://localhost:3001 y usar DevTools
```

### MediaMTX
```bash
# Ver logs detallados
./scripts/dev.sh logs mediamtx

# Verificar API
curl http://localhost:9997/v3/paths/list

# Ver métricas
curl http://localhost:9998/metrics
```

## 🗄️ Base de Datos

### Conexión desde Host
```bash
# Conectar a DB principal
psql -h localhost -p 5432 -U user_streaming -d streamingpro_dev_db

# Conectar a DB de test
psql -h localhost -p 5433 -U user_streaming -d streamingpro_test_db
```

### Migraciones
```bash
# Aplicar migraciones
./scripts/dev.sh db-migrate

# Crear nueva migración (desde shell del backend)
./scripts/dev.sh shell backend
pnpm run prisma:migrate:dev --name nombre_migracion
```

## 🧪 Testing

### Tests Unitarios
```bash
./scripts/dev.sh test
```

### Tests E2E
```bash
./scripts/dev.sh shell backend
pnpm run test:e2e
```

## 📊 Monitoreo

### Logs en Tiempo Real
```bash
# Todos los servicios
./scripts/dev.sh logs

# Servicio específico
./scripts/dev.sh logs backend
```

### Métricas de MediaMTX
- **URL**: http://localhost:9998/metrics
- **Formato**: Prometheus
- **Incluye**: Conexiones, streams, bandwidth, etc.

### Health Checks
```bash
# Estado de todos los servicios
./scripts/dev.sh status

# Health check manual
curl http://localhost:3000/health
curl http://localhost:9997/v3/paths/list
```

## 🚨 Troubleshooting

### Servicios no inician
```bash
# Ver logs de error
./scripts/dev.sh logs

# Limpiar y reiniciar
./scripts/dev.sh clean
./scripts/dev.sh build
./scripts/dev.sh start
```

### Hot-reload no funciona
```bash
# Verificar bind mounts
docker-compose -f docker-compose.dev.yml config

# Reiniciar servicio específico
docker-compose -f docker-compose.dev.yml restart backend
```

### Problemas de permisos
```bash
# Verificar ownership de archivos
ls -la apps/backend/
ls -la apps/frontend/

# Arreglar permisos si es necesario
sudo chown -R $(whoami):$(whoami) apps/
```

### Puerto ocupado
```bash
# Ver qué está usando el puerto
lsof -i :3000
lsof -i :3001

# Parar servicios y reiniciar
./scripts/dev.sh stop
./scripts/dev.sh start
```

## 🔧 Configuración Avanzada

### Variables de Entorno
Editar `docker-compose.dev.yml` para cambiar:
- Puertos de servicios
- Configuración de base de datos
- URLs de MediaMTX
- Configuración de hot-reload

### Configuración de MediaMTX
Editar `docker/mediamtx/mediamtx_dev.yml` para:
- Cambiar configuración de protocolos
- Ajustar timeouts
- Configurar authentication
- Modificar paths de streaming

## 📝 Notas Importantes

1. **Performance**: El hot-reload puede ser más lento en macOS debido a las limitaciones del filesystem binding
2. **Puertos**: Asegúrate de que los puertos 3000, 3001, 5432, 5433, 8554, 8888, 8889, 9997 estén libres
3. **Memoria**: El entorno completo usa aproximadamente 1-2GB de RAM
4. **Logs**: Los logs se persisten en `logs/` para debugging offline

## 🤝 Workflow de Desarrollo

1. **Iniciar entorno**: `./scripts/dev.sh start`
2. **Desarrollar**: Editar código con hot-reload automático
3. **Testing**: `./scripts/dev.sh test` para tests unitarios
4. **Debugging**: Usar `./scripts/dev.sh logs [servicio]` para debugging
5. **Parar entorno**: `./scripts/dev.sh stop` al finalizar

¡Feliz desarrollo! 🎉 