# Módulo MediaMTX - Nueva Arquitectura

## 🎯 Resumen

Este módulo ha sido completamente reestructurado desde cero para proporcionar una arquitectura limpia, modular y mantenible para la integración con MediaMTX.

## 📁 Estructura del Módulo

```
media-mtx/
├── interfaces/                    # Tipos y contratos
│   ├── mediamtx-api.interface.ts      # Interfaces de la API MediaMTX
│   └── stream-integration.interface.ts # Interfaces de integración
├── services/
│   ├── core/                      # Servicios núcleo
│   │   ├── mediamtx-api.service.ts    # Comunicación con API MediaMTX
│   │   └── path-manager.service.ts    # Gestión de paths y lógica de negocio
│   └── integration/               # Servicios de integración
│       ├── stream-sync.service.ts     # Sincronización de estados
│       └── stream-integration.service.ts # Orquestación principal
├── controllers/                   # Controladores REST
│   └── media-mtx.controller.ts        # Endpoints principales
├── dto/                          # DTOs y validación
│   └── path-management.dto.ts         # DTOs para gestión de paths
├── media-mtx.module.ts           # Configuración del módulo
├── index.ts                      # Exportaciones
└── README.md                     # Esta documentación
```

## 🏗️ Arquitectura

### Capa Core (Servicios Núcleo)

#### MediaMTXApiService
- **Responsabilidad**: Comunicación directa con la API v3 de MediaMTX
- **Funciones principales**:
  - Gestión de paths (crear, actualizar, eliminar, listar)
  - Monitoreo de conexiones (RTMP, SRT, RTSP)
  - Generación de URLs de streaming
  - Testing de conexión

#### PathManagerService
- **Responsabilidad**: Lógica de negocio para gestión de paths
- **Funciones principales**:
  - Creación y configuración de paths de entrada
  - Gestión de salidas y hot-reload
  - Mapeo entre entidades BD ↔ MediaMTX
  - Construcción de comandos FFmpeg

### Capa Integration (Servicios de Integración)

#### StreamSyncService
- **Responsabilidad**: Sincronización de estados entre BD y MediaMTX
- **Funciones principales**:
  - Sincronización de estados de entradas
  - Métricas de sincronización
  - Detección de cambios

#### StreamIntegrationService
- **Responsabilidad**: Orquestación de alto nivel
- **Funciones principales**:
  - Setup completo de entradas
  - Hot-reload de salidas
  - Métricas del sistema
  - Operaciones de mantenimiento

### Capa Controllers

#### MediaMTXController
- **Responsabilidad**: Endpoints REST para el frontend
- **Endpoints principales**:
  - `GET /media-mtx/status` - Estado de MediaMTX
  - `GET /media-mtx/paths` - Lista de paths
  - `GET /media-mtx/metrics` - Métricas del sistema
  - `POST /media-mtx/sync` - Sincronización manual
  - `POST /media-mtx/cleanup` - Limpieza de paths huérfanos

## 🔄 Flujo de Operaciones

### Creación de Entrada
1. `StreamIntegrationService.setupInput()`
2. `PathManagerService.createInputPath()`
3. `MediaMTXApiService.createPath()`
4. `PathManagerService.syncOutputsForInput()`
5. `StreamSyncService.syncInputState()`

### Hot-Reload de Salidas
1. `StreamIntegrationService.hotReloadOutputs()`
2. `PathManagerService.syncOutputsForInput()`
3. Para cada salida:
   - Si habilitada: `PathManagerService.activateOutput()`
   - Si deshabilitada: `PathManagerService.deactivateOutput()`

### Sincronización Periódica
1. `StreamSyncService.syncInputStates()`
2. `MediaMTXApiService.listPaths()`
3. Comparar estados BD vs MediaMTX
4. Actualizar BD según sea necesario

## 🛡️ Ventajas de la Nueva Arquitectura

### ✅ Separación de Responsabilidades
- Cada servicio tiene una responsabilidad única y clara
- Fácil testing y mantenimiento

### ✅ Escalabilidad
- Arquitectura modular permite agregar funcionalidades fácilmente
- Servicios desacoplados

### ✅ Mantenibilidad
- Código limpio y bien documentado
- Interfaces claramente definidas

### ✅ Robustez
- Manejo de errores mejorado
- Operaciones resilientes

### ✅ Testing
- Servicios fáciles de mockear
- Lógica de negocio aislada

## 🔧 Configuración

### Variables de Entorno
```env
MEDIAMTX_API_URL=http://mediamtx:9997
MEDIAMTX_API_USER=admin
MEDIAMTX_API_PASS=admin123
SERVER_IP=localhost
RTMP_PORT=1935
SRT_PORT=8890
RTSP_PORT=8554
HLS_PORT=8888
```

## 🚀 Uso desde Otros Módulos

```typescript
import { StreamIntegrationService } from '../media-mtx';

@Injectable()
export class EntradaService {
  constructor(
    private readonly streamIntegration: StreamIntegrationService
  ) {}

  async createEntrada(entrada: EntradaStream, salidas: SalidaStream[]) {
    // Crear en BD
    const savedEntrada = await this.repository.save(entrada);
    
    // Configurar en MediaMTX
    const urls = await this.streamIntegration.setupInput(savedEntrada, salidas);
    
    return { entrada: savedEntrada, urls };
  }
}
```

## 🧪 Testing

Cada servicio puede ser testeado independientemente:

```typescript
describe('PathManagerService', () => {
  let service: PathManagerService;
  let mockApiService: jest.Mocked<MediaMTXApiService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PathManagerService,
        { provide: MediaMTXApiService, useValue: mockApiService }
      ],
    }).compile();

    service = module.get<PathManagerService>(PathManagerService);
  });

  // Tests...
});
```

## 📋 Migración desde Arquitectura Anterior

La nueva arquitectura mantiene compatibilidad funcional pero con mejor organización:

| Anterior | Nuevo | Responsabilidad |
|----------|-------|----------------|
| `MediaMTXService` | `MediaMTXApiService` | API MediaMTX |
| `MediaMTXIntegrationService` | `PathManagerService` | Lógica de paths |
| `MediaMtxSyncService` | `StreamSyncService` | Sincronización |
| `MediaMTXController` | `MediaMTXController` | Endpoints REST |

## 🔮 Próximos Pasos

1. **Grabación**: Extensión para funcionalidades de recording
2. **Métricas Avanzadas**: Estadísticas detalladas de streaming
3. **Alertas**: Sistema de notificaciones por eventos
4. **Clustering**: Soporte para múltiples instancias MediaMTX 