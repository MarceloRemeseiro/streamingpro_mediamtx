/**
 * Exportaciones principales del módulo MediaMTX
 */

// Módulo principal
export { MediaMtxModule } from './media-mtx.module';

// Interfaces
export * from './interfaces/mediamtx-api.interface';
export * from './interfaces/stream-integration.interface';

// DTOs
export * from './dto/path-management.dto';

// Servicios Core
export { MediaMTXApiService } from './services/core/mediamtx-api.service';
export { PathManagerService } from './services/core/path-manager.service';

// Servicios de Integración
export { StreamSyncService } from './services/integration/stream-sync.service';
export { StreamIntegrationService } from './services/integration/stream-integration.service';

// Controladores
export { MediaMTXController } from './controllers/media-mtx.controller'; 