import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { EstadoEntradasService } from './services/estado-entradas.service';
import { EstadoSalidasService } from './services/estado-salidas.service';
import { StreamIntegrationService } from '../media-mtx/services/integration/stream-integration.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
@Injectable()
export class EstadoCoordinadorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EstadoCoordinadorService.name);
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL_MS = 5000; // 5 segundos

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly estadoEntradasService: EstadoEntradasService,
    private readonly estadoSalidasService: EstadoSalidasService,
    private readonly streamIntegrationService: StreamIntegrationService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 EstadoCoordinadorService iniciado');
    this.iniciarPolling();
  }

  onModuleDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.logger.log('⏹️ Polling de estados detenido');
    }
  }

  /**
   * Inicia el polling que verifica estados cada 5 segundos
   */
  private iniciarPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        // Verificar estados de entradas (MediaMTX)
        await this.estadoEntradasService.verificarEstadosEntradas();
        
        // Verificar estados de outputs (PIDs)
        await this.estadoSalidasService.verificarEstadosOutputs();
        
        // Obtener y emitir estadísticas de dispositivos conectados
        await this.emitirEstadisticasDispositivos();
        
        // Emitir estado general después de verificar todo
        await this.emitirEstadoGeneral();
      } catch (error) {
        this.logger.error('Error en polling de estados:', error.message);
      }
    }, this.POLLING_INTERVAL_MS);

    this.logger.log(`🔄 Polling de estados iniciado (cada ${this.POLLING_INTERVAL_MS}ms)`);
  }

  /**
   * Emite el estado general de todas las entradas y salidas
   */
  private async emitirEstadoGeneral(): Promise<void> {
    try {
      const estadoGeneral = await this.estadoEntradasService.obtenerEstadoGeneral();
      
      if (this.server) {
        this.server.emit('estado-actualizado', estadoGeneral);
        this.logger.debug(`📡 WebSocket: Estado general emitido (${estadoGeneral.entradas?.length || 0} entradas)`);
      }
    } catch (error) {
      this.logger.error('Error emitiendo estado general:', error.message);
    }
  }

  /**
   * Obtiene y emite estadísticas de dispositivos conectados via WebSocket
   */
  private async emitirEstadisticasDispositivos(): Promise<void> {
    try {
      const estadisticas = await this.streamIntegrationService.getDefaultOutputsConnectionStats();
      
      if (this.server) {
        this.server.emit('device-stats-update', {
          stats: estadisticas,
          timestamp: new Date().toISOString(),
        });
        
        this.logger.debug(`📊 WebSocket: Estadísticas de dispositivos emitidas - Total: ${estadisticas.total} (HLS: ${estadisticas.hls}, SRT: ${estadisticas.srt}, RTMP: ${estadisticas.rtmp})`);
      }
    } catch (error) {
      this.logger.error('Error emitiendo estadísticas de dispositivos:', error.message);
    }
  }

  /**
   * Fuerza una verificación inmediata de todos los estados
   */
  async forzarVerificacion(): Promise<void> {
    this.logger.log('🔄 Forzando verificación inmediata de estados...');
    
    try {
      await this.estadoEntradasService.verificarEstadosEntradas();
      await this.estadoSalidasService.verificarEstadosOutputs();
      await this.emitirEstadoGeneral();
      
      this.logger.log('✅ Verificación forzada completada');
    } catch (error) {
      this.logger.error('❌ Error en verificación forzada:', error.message);
    }
  }

  /**
   * Obtiene el estado general (para endpoints HTTP)
   */
  async obtenerEstadoGeneral(): Promise<any> {
    return this.estadoEntradasService.obtenerEstadoGeneral();
  }
} 