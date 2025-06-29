import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntradaStream } from '../entrada/entities/entrada.entity';
import { SalidaStream } from '../salida/entities/salida.entity';

// Servicios Core
import { MediaMTXApiService } from './services/core/mediamtx-api.service';
import { PathManagerService } from './services/core/path-manager.service';

// Servicios de Integración
import { StreamSyncService } from './services/integration/stream-sync.service';
import { StreamIntegrationService } from './services/integration/stream-integration.service';

// Controladores
import { MediaMTXController } from './controllers/media-mtx.controller';

// Importar EstadoNuevoModule para WebSocket
import { EstadoNuevoModule } from '../estado/estado-nuevo.module';

/**
 * Módulo MediaMTX - Arquitectura limpia y modular
 * 
 * Estructura:
 * - Core Services: Comunicación directa con MediaMTX API
 * - Integration Services: Lógica de negocio y orquestación
 * - Controllers: Endpoints REST
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EntradaStream, SalidaStream]),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Configuración de autenticación básica con MediaMTX
        const username = configService.get<string>('MEDIAMTX_API_USER', 'admin');
        const password = configService.get<string>('MEDIAMTX_API_PASS', 'admin123');
        const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
        
        return {
          baseURL: configService.get<string>('MEDIAMTX_API_URL', 'http://mediamtx:9997'),
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${basicAuth}`,
          },
        };
      },
      inject: [ConfigService],
    }),
    forwardRef(() => EstadoNuevoModule), // Usar forwardRef para evitar dependencia circular
  ],
  controllers: [MediaMTXController],
  providers: [
    // Servicios Core
    MediaMTXApiService,
    PathManagerService,
    
    // Servicios de Integración
    StreamSyncService,
    StreamIntegrationService,
  ],
  exports: [
    // Exportar los servicios principales para uso en otros módulos
    MediaMTXApiService,
    PathManagerService,
    StreamSyncService,
    StreamIntegrationService,
  ],
})
export class MediaMtxModule implements OnModuleInit {
  constructor(private readonly streamSync: StreamSyncService) {}

  async onModuleInit() {
    // Sincronización ahora se maneja desde EstadoService para evitar duplicación
    // this.streamSync.startAutoSync(5000);
  }
} 