import { Injectable, Logger } from '@nestjs/common';
import { EntradaStream } from '../../../entrada/entities/entrada.entity';
import { SalidaStream } from '../../../salida/entities/salida.entity';
import { ProtocoloStream } from '../../../entities/enums';
import { PathManagerService } from '../core/path-manager.service';
import { StreamSyncService } from './stream-sync.service';
import { MediaMTXApiService } from '../core/mediamtx-api.service';
import { StreamingUrls } from '../../interfaces/mediamtx-api.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * Servicio principal de integración entre las entidades de BD y MediaMTX
 * Orquesta todos los servicios para operaciones de alto nivel
 */
@Injectable()
export class StreamIntegrationService {
  private readonly logger = new Logger(StreamIntegrationService.name);

  constructor(
    private readonly pathManager: PathManagerService,
    private readonly syncService: StreamSyncService,
    private readonly apiService: MediaMTXApiService,
    @InjectRepository(SalidaStream)
    private readonly salidaRepository: Repository<SalidaStream>,
    @InjectRepository(EntradaStream)
    private readonly entradaRepository: Repository<EntradaStream>,
  ) {}

  // =============================================================================
  // OPERACIONES DE ENTRADA
  // =============================================================================

  /**
   * Configura completamente una nueva entrada con sus salidas
   */
  async setupInput(entrada: EntradaStream): Promise<StreamingUrls> {
    this.logger.log(`🎬 Configurando entrada completa: ${entrada.nombre}`);

    try {
      // 1. Crear el path de entrada en MediaMTX
      await this.pathManager.createInputPath(entrada);
      await this.pathManager.createDefaultOutputs(entrada);

      // 2. Sincronizar estado inicial
      await this.syncService.syncInputState(entrada);

      // 3. Generar URLs de streaming
      const urls = this.apiService.generateStreamingUrls(this.pathManager.generateInputPathName(entrada));

      this.logger.log(`✅ Entrada '${entrada.nombre}' configurada exitosamente`);
      return urls;
    } catch (error) {
      this.logger.error(`❌ Error configurando entrada '${entrada.nombre}':`, error.message);
      throw error;
    }
  }

  /**
   * Actualiza una entrada existente y sus salidas
   */
  async updateInput(entrada: EntradaStream): Promise<void> {
    this.logger.log(`🔄 Actualizando entrada: ${entrada.nombre}`);
    // Esta lógica se ha simplificado. La sincronización de salidas
    // se maneja ahora directamente en SalidaService y StreamSyncService.
    // Simplemente nos aseguramos de que el path principal existe.
    try {
      await this.pathManager.deleteInputPath(entrada);
      await this.pathManager.createInputPath(entrada);
      await this.pathManager.createDefaultOutputs(entrada);

      this.logger.log(`✅ Entrada '${entrada.nombre}' actualizada exitosamente`);
    } catch (error) {
      this.logger.error(`❌ Error actualizando entrada '${entrada.nombre}':`, error.message);
      throw error;
    }
  }

  /**
   * Elimina completamente una entrada y limpia MediaMTX
   */
  async removeInput(entrada: EntradaStream): Promise<void> {
    this.logger.log(`🗑️ Eliminando entrada: ${entrada.nombre}`);

    try {
      // Eliminar path de entrada (esto también limpiará paths de salida relacionados)
      await this.pathManager.deleteInputPath(entrada);

      this.logger.log(`✅ Entrada '${entrada.nombre}' eliminada exitosamente`);
    } catch (error) {
      this.logger.error(`❌ Error eliminando entrada '${entrada.nombre}':`, error.message);
      // No relanzamos el error para no bloquear la eliminación en BD
    }
  }

  // =============================================================================
  // OPERACIONES DE SALIDA - ESTOS MÉTODOS SE HAN MOVIDO A SALIDA.SERVICE
  // =============================================================================

  // =============================================================================
  // OPERACIONES DE ESTADO Y MONITOREO
  // =============================================================================

  /**
   * Obtiene el estado actual de una entrada
   */
  async getInputStatus(entradaNombre: string): Promise<{
    name: string;
    ready: boolean;
    bytesReceived: number;
    bytesSent: number;
    activeConnections: number;
    urls: StreamingUrls;
  }> {
    try {
      const pathInfo = await this.apiService.getPath(entradaNombre);
      const urls = this.apiService.generateStreamingUrls(entradaNombre);

      if (!pathInfo) {
        return {
          name: entradaNombre,
          ready: false,
          bytesReceived: 0,
          bytesSent: 0,
          activeConnections: 0,
          urls,
        };
      }

      return {
        name: pathInfo.name,
        ready: pathInfo.ready,
        bytesReceived: pathInfo.bytesReceived,
        bytesSent: pathInfo.bytesSent,
        activeConnections: pathInfo.readers?.length || 0,
        urls,
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo estado de '${entradaNombre}':`, error.message);
      throw error;
    }
  }

  /**
   * Sincroniza todos los estados con MediaMTX
   */
  async syncAllStates(): Promise<void> {
    this.logger.log('🔄 Sincronizando todos los estados con MediaMTX');

    try {
      await this.syncService.syncInputStates();
      this.logger.log('✅ Sincronización global completada');
    } catch (error) {
      this.logger.error('❌ Error en sincronización global:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene métricas generales del sistema
   */
  async getSystemMetrics(): Promise<{
    mediamtxConnected: boolean;
    totalPaths: number;
    activePaths: number;
    totalConnections: {
      rtmp: number;
      srt: number;
      rtsp: number;
    };
    syncMetrics: {
      totalInputs: number;
      activeInputs: number;
      inactiveInputs: number;
      lastSyncTime: Date;
    };
  }> {
    try {
      const [
        connected,
        paths,
        rtmpConnections,
        srtConnections,
        rtspConnections,
        syncMetrics,
      ] = await Promise.all([
        this.apiService.testConnection(),
        this.apiService.listPaths(),
        this.apiService.getRTMPConnections(),
        this.apiService.getSRTConnections(),
        this.apiService.getRTSPConnections(),
        this.syncService.getSyncMetrics(),
      ]);

      return {
        mediamtxConnected: connected,
        totalPaths: paths.length,
        activePaths: paths.filter(p => p.ready).length,
        totalConnections: {
          rtmp: rtmpConnections.length,
          srt: srtConnections.length,
          rtsp: rtspConnections.length,
        },
        syncMetrics,
      };
    } catch (error) {
      this.logger.error('❌ Error obteniendo métricas del sistema:', error.message);
      throw error;
    }
  }

  // =============================================================================
  // OPERACIONES DE MANTENIMIENTO
  // =============================================================================

  /**
   * Limpia paths huérfanos en MediaMTX
   */
  async cleanupOrphanedPaths(): Promise<number> {
    this.logger.log('🧹 Limpiando paths huérfanos en MediaMTX');

    try {
      const paths = await this.apiService.listPaths();
      let cleaned = 0;

      for (const path of paths) {
        // Lógica para identificar paths huérfanos
        // Por ejemplo, paths que no corresponden a ninguna entrada activa
        if (path.name.startsWith('output_') && !path.ready) {
          try {
            await this.apiService.deletePath(path.name);
            cleaned++;
            this.logger.debug(`🧹 Path huérfano eliminado: ${path.name}`);
          } catch (error) {
            this.logger.warn(`⚠️ No se pudo eliminar path huérfano: ${path.name}`);
          }
        }
      }

      this.logger.log(`✅ Limpieza completada: ${cleaned} paths eliminados`);
      return cleaned;
    } catch (error) {
      this.logger.error('❌ Error durante limpieza de paths:', error.message);
      throw error;
    }
  }

  // =============================================================================
  // ESTADÍSTICAS DE OUTPUTS POR DEFECTO
  // =============================================================================

  /**
   * Obtiene estadísticas de dispositivos conectados a outputs por defecto
   */
  async getDefaultOutputsConnectionStats(): Promise<{
    hls: number;
    srt: number;
    rtmp: number;
    total: number;
    byInput: {
      inputName: string;
      streamId: string;
      hls: number;
      srt: number;
      rtmp: number;
      total: number;
    }[];
  }> {
    this.logger.log('📊 Obteniendo estadísticas de outputs por defecto');

    try {
      // 1. Obtener todas las entradas activas con sus outputs por defecto
      const entradasActivas = await this.entradaRepository.find({
        where: { activa: true },
        relations: ['salidas'],
      });

      if (entradasActivas.length === 0) {
        return {
          hls: 0,
          srt: 0,
          rtmp: 0,
          total: 0,
          byInput: [],
        };
      }

      // 2. Filtrar solo outputs por defecto y obtener streamIds
      const OUTPUTS_POR_DEFECTO = ['SRT Pull', 'RTMP Pull', 'HLS'];
      const streamIds: string[] = [];
      const inputStreamMap: { [streamId: string]: string } = {};

      for (const entrada of entradasActivas) {
        const outputsPorDefecto = entrada.salidas.filter(salida => 
          OUTPUTS_POR_DEFECTO.includes(salida.nombre) && salida.habilitada
        );

        if (outputsPorDefecto.length > 0) {
          let pathName: string | null = null;
          
          // Calcular path según protocolo (igual que calcularPathParaLectura)
          if (entrada.protocolo === ProtocoloStream.RTMP && entrada.streamKey) {
            // RTMP usa live/{streamKey} para recibir
            pathName = `live/${entrada.streamKey}`;
          } else if (entrada.protocolo === ProtocoloStream.SRT && entrada.streamId) {
            // SRT usa {streamId} directo (sin prefijo "publish:")
            pathName = entrada.streamId.replace('publish:', '');
          }

          if (pathName) {
            streamIds.push(pathName);
            inputStreamMap[pathName] = entrada.nombre;
          }
        }
      }

      if (streamIds.length === 0) {
        return {
          hls: 0,
          srt: 0,
          rtmp: 0,
          total: 0,
          byInput: [],
        };
      }

      // 3. Obtener estadísticas de MediaMTX
      const totalStats = await this.apiService.getDefaultOutputsConnectionStats(streamIds);

      // 4. Obtener estadísticas por entrada individual (opcional, para detalles)
      const byInput = await Promise.all(
        streamIds.map(async (pathName) => {
          const inputStats = await this.apiService.getDefaultOutputsConnectionStats([pathName]);
          return {
            inputName: inputStreamMap[pathName],
            streamId: pathName, // Realmente es pathName (puede ser live/xxx para RTMP)
            hls: inputStats.hls,
            srt: inputStats.srt,
            rtmp: inputStats.rtmp,
            total: inputStats.total,
          };
        })
      );

      this.logger.log(`📊 Estadísticas obtenidas: HLS=${totalStats.hls}, SRT=${totalStats.srt}, RTMP=${totalStats.rtmp}, Total=${totalStats.total}`);

      return {
        ...totalStats,
        byInput,
      };

    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas de outputs por defecto:', error.message);
      throw error;
    }
  }
} 