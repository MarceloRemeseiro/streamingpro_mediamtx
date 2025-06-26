# 📁 Estructura del Proyecto: StreamingPro Restreamer

**Generado el:** 2025-06-26 16:41:31  
**Actualizado el:** 2025-06-26 17:30:00 (Post-documentación MediaMTX)

## 🎯 Descripción del Proyecto

Sistema de streaming profesional que permite recibir streams SRT/RTMP/HLS y redistribuirlos a múltiples destinos como YouTube, Twitch, etc.

**Stack Tecnológico:**
- **Backend:** NestJS 11 + TypeScript + PostgreSQL 15 + **TypeORM** (migrado desde Prisma)
- **Frontend:** Next.js 15 + React 19 + Tailwind CSS + shadcn/ui  
- **Media Server:** MediaMTX para SRT/RTMP/HLS
- **Containerización:** Docker + Docker Compose
- **Base de Datos:** PostgreSQL 15

## 🔄 Cambios Recientes (Post-Migración)

### ✅ **Backend Modularizado**
- **Eliminado:** Prisma ORM (problemas constantes con Docker)
- **Migrado a:** TypeORM con sincronización automática
- **Nueva estructura:** Servicios especializados por funcionalidad
- **Arquitectura limpia:** Separación clara de responsabilidades

### ✅ **Servicios Implementados**
1. **EntradaService** (`/entrada`) - CRUD completo para streams de entrada
2. **SalidaService** (`/salida`) - CRUD completo para outputs 
3. **EstadoService** (`/estado`) - WebSockets + monitoreo en tiempo real
4. **EstadisticasService** (`/estadisticas`) - Métricas y análisis

### ✅ **Frontend Actualizado**
- **API actualizada:** Nuevas rutas del backend modularizado
- **Tipos sincronizados:** Compatibles con entidades TypeORM
- **Componentes limpios:** Eliminadas referencias obsoletas

### ✅ **Scripts Optimizados**
- **dev.sh:** Eliminadas referencias a Prisma
- **test-stability.sh:** Actualizado para nuevos endpoints
- **Archivos limpiados:** Eliminados temporales y obsoletos

## 🎯 **Próxima Fase: Integración MediaMTX API**

### **📡 MediaMTX Service - Nueva Implementación**

Basándome en la [documentación oficial de MediaMTX](https://bluenviron.github.io/mediamtx/), necesitamos implementar:

#### **1. Gestión de Paths Dinámicos**
```typescript
// MediaMTX API v3 Endpoints
POST /v3/config/paths/add/{name}     // Crear path
PATCH /v3/config/paths/patch/{name}  // Actualizar path  
DELETE /v3/config/paths/delete/{name} // Eliminar path
GET /v3/paths/list                   // Lista paths activos
GET /v3/paths/get/{name}            // Estado específico
```

#### **2. Monitoreo de Conexiones**
```typescript
// Endpoints de estado por protocolo
GET /v3/rtmpconns/list  // Conexiones RTMP
GET /v3/srtconns/list   // Conexiones SRT  
GET /v3/rtspconns/list  // Conexiones RTSP
POST /v3/{tipo}conns/kick/{id} // Desconectar
```

#### **3. Configuración de Outputs Automatizada**
```typescript
// Crear outputs automáticamente al crear entrada
interface MediaMTXPath {
  name: string;
  source?: string;           // Para ingest externo
  record?: boolean;          // Grabación
  srtPublishPassphrase?: string;
  overridePublisher?: boolean;
}
```

### **🔧 Funcionalidades Clave Identificadas**

#### **Hot-Reload de Outputs**
- **Crear paths dinámicamente** cuando se activa una salida
- **Eliminar paths automáticamente** cuando se desactiva
- **Sincronización bidireccional** entre BD y MediaMTX

#### **Monitoreo en Tiempo Real**
- **WebSockets** para estados de conexión
- **Estadísticas detalladas** de SRT (packets, latencia, loss rate)
- **Alertas automáticas** por fallos de conexión

#### **Configuración Avanzada SRT**
```typescript
// Configuración SRT específica
interface SRTConfig {
  latency: number;           // 200ms default
  passphrase?: string;       // AES encryption
  streamid: string;          // publish:HASH format
  mode: 'caller' | 'listener'; // Dirección de conexión
}
```

#### **URL Generation Inteligente**
```bash
# Formatos de URL MediaMTX
RTMP:  rtmp://localhost:1935/{streamKey}
SRT:   srt://localhost:8890?streamid=publish:{streamId}
RTSP:  rtsp://localhost:8554/{streamKey}
HLS:   http://localhost:8888/{streamKey}/index.m3u8
```

### **📋 Plan de Implementación**

#### **Fase 1: MediaMTXService Core**
- [ ] Cliente HTTP para API v3 de MediaMTX
- [ ] Gestión de paths dinámicos (create/update/delete)
- [ ] Monitoreo de estados y conexiones
- [ ] Logs estructurados y manejo de errores

#### **Fase 2: Hot-Reload System**
- [ ] Sincronización automática BD ↔ MediaMTX
- [ ] Activación/desactivación de outputs en tiempo real
- [ ] Validación de configuraciones antes de aplicar

#### **Fase 3: Monitoring & Analytics**
- [ ] Dashboard en tiempo real con WebSockets
- [ ] Métricas avanzadas (bandwith, quality, stability)
- [ ] Alertas y notificaciones automáticas

#### **Fase 4: Advanced Features**
- [ ] Transcoding profiles
- [ ] Recording automático
- [ ] Load balancing entre instancias MediaMTX

## 📁 Estructura Actual

```
streamingpro-restreamer/
├── apps/
│   ├── backend/                  # NestJS 11 + TypeORM
│   │   ├── src/
│   │   │   ├── entrada/         # ✅ CRUD entradas
│   │   │   ├── salida/          # ✅ CRUD salidas  
│   │   │   ├── estado/          # ✅ WebSockets + estado
│   │   │   ├── estadisticas/    # ✅ Estructura base
│   │   │   ├── config/          # ✅ Database config
│   │   │   └── entities/        # ✅ TypeORM entities
│   │   └── package.json         # ✅ Limpio sin Prisma
│   └── frontend/                # Next.js 15 + shadcn/ui
│       ├── src/
│       │   ├── components/      # ✅ Actualizados
│       │   ├── lib/
│       │   │   ├── api.ts      # ✅ Nuevas rutas
│       │   │   └── config.ts   # ✅ Variables entorno
│       │   └── types/          # ✅ Tipos sincronizados
│       └── package.json        # ✅ Sin package-lock.json
├── docker/                     
│   ├── backend/                # ✅ Dockerfiles limpios
│   ├── frontend/               # ✅ Sin referencias Prisma
│   └── mediamtx/              # ✅ Configuración MediaMTX
├── scripts/
│   ├── dev.sh                 # ✅ Actualizado sin Prisma
│   └── test-stability.sh      # ✅ Nuevos endpoints
└── docker-compose.dev.yml     # ✅ Stack completo funcional
```

## 🚀 **Estado Actual: LISTO PARA MEDIAMTX**

### **✅ Completado**
- ✅ Backend modular con TypeORM funcionando
- ✅ Frontend conectado a nuevas APIs  
- ✅ Docker stack completo operativo
- ✅ Documentación MediaMTX analizada
- ✅ Plan de implementación definido

### **🎯 Siguiente Paso Inmediato**
**Implementar MediaMTXService** con integración completa a la API v3, comenzando por la gestión de paths dinámicos y monitoreo de estados.

---

**Documentación técnica:**
- [MediaMTX API Official](https://bluenviron.github.io/mediamtx/)
- [Context7 MediaMTX Docs](https://context7.com/bluenviron/mediamtx/llms.txt)
- [StreamingPro Context](./docs/contexto_proyecto_streaming.md)
