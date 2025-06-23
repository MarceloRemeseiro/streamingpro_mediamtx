# StreamingPro Restreamer

Plataforma B2B de distribución de streaming SRT/RTMP que permite recibir flujos de entrada y redistribuirlos a múltiples destinos de forma eficiente y escalable.

## 🚀 Características Principales

- **Múltiples Protocolos**: Soporte completo para SRT y RTMP
- **Distribución Flexible**: Outputs por defecto (SRT Pull, RTMP Pull, HLS) y outputs personalizados
- **Interfaz Moderna**: Dashboard web con tema claro/oscuro y diseño responsive
- **API REST Completa**: Backend NestJS con documentación OpenAPI/Swagger
- **Base de Datos Robusta**: PostgreSQL con Prisma ORM
- **Testing Completo**: Tests unitarios y de integración E2E
- **Configuración Segura**: Cifrado SRT AES-128/256, validaciones robustas

## 🏗️ Arquitectura

### Backend (NestJS 11)
- **Módulos**: StreamsModule, AuthModule (futuro), MetricsModule (futuro)
- **Base de Datos**: PostgreSQL 15 con Prisma ORM
- **API**: REST con documentación Swagger automática
- **Validación**: DTOs con class-validator y transformaciones
- **Testing**: 37 tests (20 unitarios + 17 E2E) con 84% de cobertura

### Frontend (Next.js 15)
- **Framework**: React 19 con App Router
- **Estilos**: Tailwind CSS + shadcn/ui
- **Temas**: Sistema completo claro/oscuro con colores azules y grises
- **Componentes**: Cards colapsables para gestión intuitiva de streams
- **Estado**: React hooks con integración API REST

### Servidor de Medios
- **Principal**: MediaMTX (recomendado)
- **Alternativa**: Nginx-RTMP + SRT-live-transmit
- **Funcionalidad**: Passthrough sin transcodificación pesada en MVP

## 📦 Estructura del Proyecto

```
streamingpro-restreamer/
├── apps/
│   ├── backend/          # API NestJS
│   │   ├── src/
│   │   │   ├── streams/  # Módulo de streams
│   │   │   └── prisma/   # Cliente Prisma generado
│   │   ├── prisma/       # Esquemas y migraciones
│   │   └── test/         # Tests E2E
│   └── frontend/         # App Next.js
│       ├── src/
│       │   ├── app/      # App Router
│       │   ├── components/ # Componentes React
│       │   ├── lib/      # API client y utilidades
│       │   └── types/    # Tipos TypeScript
├── docs/                 # Documentación del proyecto
├── docker-compose.yml    # PostgreSQL para desarrollo
└── package.json         # Scripts del monorepo
```

## 🚀 Inicio Rápido

### Prerequisitos

- Node.js 22.16 LTS
- pnpm 8+
- Docker y Docker Compose
- PostgreSQL 15 (via Docker)

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd streamingpro-restreamer

# Instalar dependencias
pnpm install

# Levantar base de datos
pnpm run db:up

# Instalar dependencias del backend
cd apps/backend && npm install

# Configurar base de datos
npx prisma migrate dev
npx prisma generate

# Instalar dependencias del frontend  
cd ../frontend && npm install
```

### Desarrollo

```bash
# Opción 1: Ejecutar todo junto (recomendado)
pnpm run dev

# Opción 2: Ejecutar por separado
# Terminal 1 - Backend
pnpm run dev:backend

# Terminal 2 - Frontend  
pnpm run dev:frontend
```

### Acceso a la Aplicación

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api
- **Base de Datos**: PostgreSQL en localhost:5432

## 🧪 Testing

### Backend

```bash
cd apps/backend

# Tests unitarios
npm run test

# Tests E2E
npm run test:e2e

# Coverage
npm run test:cov

# Todos los tests
npm run test:all
```

**Resultados actuales**: 37 tests pasando (20 unitarios + 17 E2E) con 84.44% de cobertura.

### Frontend

```bash
cd apps/frontend

# Linting
npm run lint

# Build para verificar errores
npm run build
```

## 📊 Modelo de Datos

### Entradas de Stream
- **Protocolos**: RTMP, SRT
- **Campos RTMP**: claveStream (generada automáticamente)
- **Campos SRT**: puertoSRT, latenciaSRT, passphraseSRT, streamId
- **Relaciones**: Una entrada → múltiples salidas

### Salidas de Stream  
- **Protocolos**: RTMP, SRT, HLS
- **Estados**: habilitada/deshabilitada
- **Tipos**: Por defecto (SRT Pull, RTMP Pull, HLS) y personalizadas
- **Configuración**: Específica por protocolo

## 🔧 Configuración

### Variables de Entorno

#### Backend (`apps/backend/.env`)
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/streamingpro"
PORT=3000
```

#### Frontend (`apps/frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Base de Datos

```bash
# Levantar PostgreSQL
pnpm run db:up

# Aplicar migraciones
cd apps/backend && npx prisma migrate dev

# Regenerar cliente
npx prisma generate

# Ver datos (Prisma Studio)
npx prisma studio
```

## 📡 API Endpoints

### Entradas de Stream
- `GET /streams/entradas` - Listar todas las entradas
- `POST /streams/entradas` - Crear entrada
- `GET /streams/entradas/:id` - Obtener entrada específica
- `PUT /streams/entradas/:id` - Actualizar entrada
- `DELETE /streams/entradas/:id` - Eliminar entrada

### Salidas de Stream
- `GET /streams/salidas` - Listar todas las salidas
- `POST /streams/salidas` - Crear salida
- `GET /streams/entradas/:entradaId/salidas` - Salidas de una entrada
- `PUT /streams/salidas/:id` - Actualizar salida
- `DELETE /streams/salidas/:id` - Eliminar salida

**Documentación completa**: http://localhost:3000/api

## 🎨 Interfaz de Usuario

### Características del Frontend
- **Dashboard**: Grid responsive de cards de entrada
- **Cards Colapsables**: Componentes expandibles para optimizar espacio
- **Temas**: Modo claro/oscuro con colores azules y grises
- **Estados Visuales**: LEDs de actividad, badges de protocolo
- **Interacciones**: Botones copiar, switches de habilitación

### Componentes de la Card
1. **Cabecera**: Nombre, estado, protocolo, eliminar
2. **Video**: Reproductor HLS (placeholder)
3. **Datos**: URLs de conexión y configuración
4. **Outputs Defecto**: SRT Pull, RTMP Pull, HLS
5. **Outputs Custom**: Salidas personalizadas push

## 🔐 Seguridad

- **Validaciones**: DTOs con class-validator en todos los endpoints
- **Cifrado SRT**: Soporte para AES-128/256 con passphrase
- **RTMPS**: Soporte para RTMP sobre SSL/TLS
- **Autenticación**: JWT preparado para implementación futura
- **Variables de Entorno**: Validación con Zod en ConfigModule

## 🚀 Despliegue

### Desarrollo
```bash
# Base de datos
pnpm run db:up

# Aplicación completa
pnpm run dev
```

### Producción
```bash
# Build
pnpm run build

# Ejecutar backend
cd apps/backend && npm run start:prod

# Ejecutar frontend
cd apps/frontend && npm start
```

### Docker (Futuro)
- Dockerfile para backend y frontend
- docker-compose.yml para producción
- Variables de entorno para diferentes entornos

## 🛠️ Tecnologías

### Backend
- **NestJS 11**: Framework Node.js escalable
- **TypeScript**: Tipado estático
- **Prisma**: ORM moderno para PostgreSQL
- **PostgreSQL 15**: Base de datos relacional
- **Jest + Supertest**: Testing unitario y E2E
- **Class Validator**: Validación de DTOs
- **Swagger**: Documentación automática de API

### Frontend
- **Next.js 15**: Framework React con App Router
- **React 19**: Biblioteca de UI moderna
- **Tailwind CSS**: Framework de estilos utility-first
- **shadcn/ui**: Componentes de UI elegantes
- **next-themes**: Gestión de temas
- **Axios**: Cliente HTTP
- **Lucide React**: Iconos

### DevOps
- **pnpm**: Gestor de paquetes eficiente
- **ESLint + Prettier**: Calidad de código
- **Docker Compose**: Desarrollo con PostgreSQL
- **Git**: Control de versiones con .gitignore completo

## 📈 Próximas Funcionalidades

### Backend
- [ ] Módulo de autenticación JWT con 2FA opcional
- [ ] Módulo de métricas y monitoreo
- [ ] WebSockets para actualizaciones en tiempo real
- [ ] Rate limiting y throttling
- [ ] Logging estructurado

### Frontend  
- [ ] Modales para crear/editar entradas y salidas
- [ ] Reproductor HLS funcional
- [ ] Notificaciones toast
- [ ] Métricas en tiempo real
- [ ] Filtros y búsqueda
- [ ] Exportación de configuraciones

### Infraestructura
- [ ] Integración con MediaMTX
- [ ] Contenedores Docker
- [ ] CI/CD con GitHub Actions
- [ ] Monitoreo con Prometheus/Grafana
- [ ] Backup automático de base de datos

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Estándares de Código
- ESLint Airbnb para JavaScript/TypeScript
- Prettier para formateo automático
- Convención de commits semánticos
- Tests obligatorios para nuevas funcionalidades

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico:
- Crear issue en GitHub
- Revisar documentación en `/docs`
- Consultar logs de aplicación
- Verificar configuración de base de datos

---

**Desarrollado con ❤️ para distribución profesional de streaming** 