# 🧪 Guía de Testing - StreamingPro Backend

Esta guía explica cómo configurar y ejecutar los tests del backend de StreamingPro.

## 📋 Tipos de Tests

### 1. **Tests Unitarios**
- **Ubicación**: `src/**/*.spec.ts`
- **Propósito**: Probar lógica de negocio aislada con mocks
- **Cobertura**: StreamsService (84.44% statements)

### 2. **Tests de Integración (E2E)**
- **Ubicación**: `test/**/*.e2e-spec.ts`
- **Propósito**: Probar endpoints completos con base de datos real
- **Cobertura**: API REST completa

## 🔧 Configuración Inicial

### 1. Base de Datos de Testing

Asegúrate de tener la base de datos de testing ejecutándose:

```bash
# Desde la raíz del proyecto
docker-compose up -d postgres-test
```

### 2. Variables de Entorno

Crea el archivo `apps/backend/.env.test`:

```env
DATABASE_URL="postgresql://user_streaming:password_streaming@localhost:5433/streamingpro_test_db?schema=public"
```

### 3. Aplicar Migraciones

```bash
cd apps/backend
pnpm run test:db
```

## 🚀 Comandos de Testing

### Tests Unitarios

```bash
# Ejecutar todos los tests unitarios
pnpm run test

# Ejecutar tests específicos
pnpm run test streams.service.spec.ts

# Ejecutar tests en modo watch
pnpm run test:watch

# Generar reporte de cobertura
pnpm run test:coverage
```

### Tests de Integración (E2E)

```bash
# Ejecutar todos los tests e2e
DATABASE_URL="postgresql://user_streaming:password_streaming@localhost:5433/streamingpro_test_db?schema=public" pnpm run test:e2e

# O usar el script configurado
pnpm run test:e2e
```

### Ejecutar Todos los Tests

```bash
# Tests unitarios + integración
pnpm run test:all
```

## 📊 Cobertura Actual

- **StreamsService**: 84.44% statements
- **Tests Unitarios**: 19 tests ✅
- **Tests E2E**: 16 tests ✅
- **Total**: 35 tests ✅

## 🏗️ Estructura de Tests

### Tests Unitarios (`src/streams/streams.service.spec.ts`)

```typescript
describe('StreamsService', () => {
  // Tests para creación de entradas
  describe('crearEntrada', () => {
    it('debería crear una entrada RTMP con clave generada automáticamente')
    it('debería crear una entrada SRT sin clave de stream')
    it('debería generar claves únicas para RTMP')
  })

  // Tests para CRUD completo
  describe('obtenerEntradas', () => { ... })
  describe('actualizarEntrada', () => { ... })
  describe('eliminarEntrada', () => { ... })
  
  // Tests para salidas
  describe('crearSalida', () => { ... })
  describe('obtenerSalidasPorEntrada', () => { ... })
})
```

### Tests E2E (`test/streams.e2e-spec.ts`)

```typescript
describe('Streams Controller (e2e)', () => {
  // Tests de endpoints de entradas
  describe('/streams/entradas (POST)', () => { ... })
  describe('/streams/entradas (GET)', () => { ... })
  
  // Tests de endpoints de salidas
  describe('/streams/salidas (POST)', () => { ... })
  describe('/streams/entradas/:entradaId/salidas (GET)', () => { ... })
  
  // Tests de actualización y eliminación
  describe('Actualización y eliminación', () => { ... })
})
```

## 🎯 Casos de Prueba Cubiertos

### ✅ Entradas de Stream
- [x] Crear entrada RTMP (genera clave automáticamente)
- [x] Crear entrada SRT (con latencia y passphrase)
- [x] Validar protocolos inválidos
- [x] Validar campos requeridos
- [x] Listar todas las entradas
- [x] Obtener entrada por ID
- [x] Actualizar entrada existente
- [x] Eliminar entrada (cascada a salidas)
- [x] Manejo de entradas inexistentes

### ✅ Salidas de Stream
- [x] Crear salida RTMP (YouTube, Twitch, etc.)
- [x] Crear salida SRT (con configuración específica)
- [x] Crear salida HLS (para web)
- [x] Validar URLs de streaming (rtmp://, srt://)
- [x] Validar entrada padre existente
- [x] Obtener salidas por entrada
- [x] Actualizar salidas existentes
- [x] Eliminar salidas
- [x] Manejo de salidas inexistentes

### ✅ Validaciones
- [x] Protocolos válidos (RTMP, SRT, HLS)
- [x] URLs de streaming válidas
- [x] Rangos de latencia SRT (80-2000ms)
- [x] Campos condicionales por protocolo
- [x] Relaciones entre entradas y salidas

## 🔍 Debugging Tests

### Ver logs detallados:
```bash
pnpm run test -- --verbose
```

### Ejecutar un test específico:
```bash
pnpm run test -- --testNamePattern="debería crear una entrada RTMP"
```

### Debug mode:
```bash
pnpm run test:debug
```

## 🧹 Limpieza

### Resetear base de datos de testing:
```bash
pnpm run test:teardown
```

### Parar contenedores de testing:
```bash
docker-compose down postgres-test
```

## 📈 Próximos Pasos

- [ ] Tests para autenticación JWT
- [ ] Tests para métricas y auditoría
- [ ] Tests de performance
- [ ] Tests de carga con múltiples streams
- [ ] Mocks para MediaMTX integration

---

> **Nota**: Los tests están configurados para ejecutarse de forma aislada y limpiar datos automáticamente entre ejecuciones. 