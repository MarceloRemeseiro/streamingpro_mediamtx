#!/bin/bash

# Script para generar un archivo markdown con la estructura del proyecto
# Uso: ./scripts/generar-estructura.sh

OUTPUT_FILE="ESTRUCTURA-PROYECTO.md"
PROJECT_NAME="StreamingPro Restreamer"

echo "📁 Generando estructura del proyecto en $OUTPUT_FILE..."

# Función para obtener la fecha actual
get_date() {
    date "+%Y-%m-%d %H:%M:%S"
}

# Crear el archivo markdown
cat > "$OUTPUT_FILE" << EOF
# 📁 Estructura del Proyecto: $PROJECT_NAME

**Generado el:** $(get_date)

## 🎯 Descripción del Proyecto

Sistema de streaming profesional que permite recibir streams SRT/RTMP/HLS y redistribuirlos a múltiples destinos como YouTube, Twitch, etc.

**Stack Tecnológico:**
- **Backend:** NestJS 11 + TypeScript + PostgreSQL 15 + Prisma ORM
- **Frontend:** Next.js 15 + React 19 + Tailwind CSS + shadcn/ui  
- **Media Server:** MediaMTX para SRT/RTMP/HLS
- **Containerización:** Docker + Docker Compose
- **Base de Datos:** PostgreSQL 15

---

## 📂 Estructura de Directorios

\`\`\`
EOF

# Generar la estructura del árbol excluyendo archivos innecesarios
tree -a -I 'node_modules|.git|.next|dist|build|coverage|logs|*.log|.env|.DS_Store|Thumbs.db|postgres_*_data' >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << 'EOF'
```

---

## 📋 Descripción de Directorios Principales

### 🏗️ **apps/**
Contiene las aplicaciones principales del monorepo.

#### **apps/backend/**
- **Tecnología:** NestJS 11 + TypeScript + Prisma ORM
- **Puerto:** 3000
- **Función:** API REST para gestión de streams, configuración de outputs y comunicación con MediaMTX

#### **apps/frontend/** 
- **Tecnología:** Next.js 15 + React 19 + Tailwind CSS + shadcn/ui
- **Puerto:** 3001  
- **Función:** Interfaz web para gestión de streams y monitoreo

### 🐳 **docker/**
Configuraciones Docker para cada servicio.

#### **docker/backend/**
- `Dockerfile.dev` - Imagen de desarrollo con hot-reload
- `start-dev.sh` - Script de inicio para desarrollo
- `start-prod.sh` - Script de inicio para producción

#### **docker/frontend/**
- `Dockerfile.dev` - Imagen de desarrollo con hot-reload

#### **docker/mediamtx/**
- `Dockerfile` - Imagen personalizada de MediaMTX
- `mediamtx_dev.yml` - Configuración para desarrollo
- `mediamtx_example.yml` - Configuración de ejemplo
- `mediamtx_simple.yml` - Configuración básica

### 📚 **docs/**
Documentación técnica del proyecto.

### 🛠️ **scripts/**
Scripts utilitarios para desarrollo y mantenimiento.

---

## 🔧 Archivos de Configuración

| Archivo | Descripción |
|---------|-------------|
| `package.json` | Configuración del workspace raíz |
| `pnpm-workspace.yaml` | Configuración del monorepo con pnpm |
| `docker-compose.yml` | Orquestación para producción |
| `docker-compose.dev.yml` | Orquestación para desarrollo |
| `docker-compose.testing.yml` | Orquestación para testing |

---

## 🚀 Comandos Principales

### Desarrollo
```bash
# Iniciar todo el stack de desarrollo
docker-compose -f docker-compose.dev.yml up -d

# Ver logs en tiempo real
docker-compose -f docker-compose.dev.yml logs -f

# Parar el stack
docker-compose -f docker-compose.dev.yml down
```

### Producción
```bash
# Iniciar en producción
docker-compose up -d

# Ver logs
docker-compose logs -f
```

---

## 🌐 Puertos por Defecto

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Backend (NestJS) | 3000 | API REST |
| Frontend (Next.js) | 3001 | Interfaz web |
| PostgreSQL | 5432 | Base de datos principal |
| PostgreSQL Test | 5433 | Base de datos de testing |
| MediaMTX API | 9997 | API de gestión |
| MediaMTX HLS | 8888 | Streaming HLS |
| MediaMTX RTMP | 1935 | Entrada RTMP |
| MediaMTX SRT | 8890 | Entrada SRT (UDP/TCP) |
| MediaMTX RTSP | 8554 | Streaming RTSP |
| MediaMTX WebRTC | 8889 | Streaming WebRTC |

---

## 📊 Protocolos Soportados

### **Entrada (Input)**
- ✅ **SRT** - Ultra-low latency con cifrado
- ✅ **RTMP** - Compatible con OBS, FFmpeg
- ✅ **RTSP** - Cámaras IP

### **Salida (Output)**
- ✅ **RTMP/RTMPS** - YouTube, Twitch, Facebook
- ✅ **SRT** - Redistribución con baja latencia
- ✅ **HLS** - Reproducción web
- 🔄 **WebRTC** - En desarrollo

---

## 🔐 Seguridad

- **Autenticación JWT** para API
- **Cifrado SRT** con AES-128/256
- **RTMPS** para conexiones seguras
- **Variables de entorno** para credenciales

---

*Estructura generada automáticamente el $(get_date)*
EOF

echo "✅ Estructura generada exitosamente en: $OUTPUT_FILE"
echo "📖 Puedes abrir el archivo con: open $OUTPUT_FILE"

# Mostrar estadísticas básicas
echo ""
echo "📊 Estadísticas del proyecto:"
echo "   📁 Directorios: $(find . -type d ! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/.next/*' | wc -l)"
echo "   📄 Archivos: $(find . -type f ! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/.next/*' | wc -l)"
echo "   📝 Archivos TypeScript: $(find . -name '*.ts' -o -name '*.tsx' | wc -l)"
echo "   🐳 Archivos Docker: $(find . -name 'Dockerfile*' -o -name 'docker-compose*.yml' | wc -l)"