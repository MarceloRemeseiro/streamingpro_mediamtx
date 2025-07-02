import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import {
  MediaMTXPathConfig,
  MediaMTXPathInfo,
  MediaMTXConnectionInfo,
  MediaMTXSRTConnectionInfo,
  MediaMTXRTMPConnectionInfo,
  MediaMTXRTSPConnectionInfo,
  MediaMTXPathListResponse,
  MediaMTXPathStatus,
  MediaMTXOutputVerification,
  StreamingUrls,
} from '../../interfaces/mediamtx-api.interface';

/**
 * Servicio core para interactuar con la API v3 de MediaMTX
 * Responsabilidad única: comunicación directa con MediaMTX
 */
@Injectable()
export class MediaMTXApiService implements OnModuleInit {
  private readonly logger = new Logger(MediaMTXApiService.name);
  private readonly apiBaseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiBaseUrl = this.configService.get<string>('MEDIAMTX_API_URL', 'http://mediamtx:9997');
  }

  async onModuleInit() {
    this.logger.log('🚀 Inicializando MediaMTX API Service...');
    await this.testConnection();
  }

  // =============================================================================
  // CONEXIÓN Y ESTADO
  // =============================================================================

  /**
   * Prueba la conexión con MediaMTX
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('/v3/config/global/get')
      );
      this.logger.log('✅ Conexión con MediaMTX establecida correctamente');
      return true;
    } catch (error) {
      this.logger.error('❌ Error al conectar con MediaMTX:', this.formatError(error));
      return false;
    }
  }

  // =============================================================================
  // GESTIÓN DE PATHS
  // =============================================================================

  /**
   * Crea un nuevo path en MediaMTX
   */
  async createPath(name: string, config: Partial<MediaMTXPathConfig>): Promise<void> {
    this.logger.log(`🆕 Creando path: ${name}`);
    
    try {
      await firstValueFrom(
        this.httpService.post(`/v3/config/paths/add/${name}`, config)
      );
      this.logger.log(`✅ Path '${name}' creado exitosamente`);
    } catch (error) {
      this.logger.error(`❌ Error creando path '${name}':`, this.formatError(error));
      throw new Error(`Error creando path MediaMTX: ${this.formatError(error)}`);
    }
  }

  /**
   * Actualiza la configuración de un path existente
   */
  async updatePath(name: string, config: Partial<MediaMTXPathConfig>): Promise<void> {
    this.logger.log(`🔄 Actualizando path: ${name}`);
    
    try {
      await firstValueFrom(
        this.httpService.patch(`/v3/config/paths/patch/${name}`, config)
      );
      this.logger.log(`✅ Path '${name}' actualizado exitosamente`);
    } catch (error) {
      this.logger.error(`❌ Error actualizando path '${name}':`, this.formatError(error));
      throw new Error(`Error actualizando path MediaMTX: ${this.formatError(error)}`);
    }
  }

  /**
   * Elimina un path de MediaMTX
   */
  async deletePath(name: string): Promise<void> {
    this.logger.log(`🗑️ Eliminando path: ${name}`);
    
    try {
      await firstValueFrom(
        this.httpService.delete(`/v3/config/paths/delete/${name}`)
      );
      this.logger.log(`✅ Path '${name}' eliminado exitosamente`);
    } catch (error) {
      this.logger.error(`❌ Error eliminando path '${name}':`, this.formatError(error));
      throw new Error(`Error eliminando path MediaMTX: ${this.formatError(error)}`);
    }
  }

  /**
   * Obtiene la lista de todos los paths activos
   */
  async listPaths(): Promise<MediaMTXPathInfo[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('/v3/paths/list')
      );
      return response.data.items || [];
    } catch (error) {
      this.logger.error('❌ Error obteniendo lista de paths:', this.formatError(error));
      throw new Error(`Error obteniendo paths MediaMTX: ${this.formatError(error)}`);
    }
  }

  /**
   * Obtiene información específica de un path
   */
  async getPath(name: string): Promise<MediaMTXPathInfo | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`/v3/paths/get/${name}`)
      );
      return response.data;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      this.logger.error(`❌ Error obteniendo path '${name}':`, this.formatError(error));
      throw new Error(`Error obteniendo path MediaMTX: ${this.formatError(error)}`);
    }
  }

  // =============================================================================
  // VERIFICACIÓN DE ESTADO DE OUTPUTS (NUEVO)
  // =============================================================================

  /**
   * Verifica el estado real de un path específico en MediaMTX
   * Esto nos permite detectar si realmente está funcionando el streaming
   */
  async verifyPathStatus(pathName: string): Promise<MediaMTXPathStatus> {
    this.logger.debug(`🔍 Verificando estado del path: ${pathName}`);
    
    try {
      const pathInfo = await this.getPath(pathName);
      
      if (!pathInfo) {
        return {
          pathName,
          exists: false,
          ready: false,
          hasReaders: false,
          bytesReceived: 0,
          bytesSent: 0,
          tracks: [],
          source: '',
        };
      }

      return {
        pathName,
        exists: true,
        ready: pathInfo.ready,
        hasReaders: pathInfo.readers && pathInfo.readers.length > 0,
        bytesReceived: pathInfo.bytesReceived || 0,
        bytesSent: pathInfo.bytesSent || 0,
        readyTime: pathInfo.readyTime,
        tracks: pathInfo.tracks || [],
        source: pathInfo.source || '',
      };
    } catch (error) {
      this.logger.error(`❌ Error verificando estado del path '${pathName}':`, this.formatError(error));
      return {
        pathName,
        exists: false,
        ready: false,
        hasReaders: false,
        bytesReceived: 0,
        bytesSent: 0,
        tracks: [],
        source: '',
      };
    }
  }

  /**
   * Verifica si un output está realmente funcionando
   * Combina múltiples factores para determinar el estado real
   */
  async verifyOutputStatus(pathName: string): Promise<MediaMTXOutputVerification> {
    this.logger.debug(`🔍 Verificando output: ${pathName}`);
    
    try {
      const pathStatus = await this.verifyPathStatus(pathName);
      
      // Un output está funcionando si:
      // 1. El path existe en MediaMTX
      // 2. Está en estado "ready" 
      // 3. Tiene bytes enviados (indica tráfico saliente)
      const isActive = pathStatus.exists && pathStatus.ready;
      const isStreaming = isActive && pathStatus.bytesSent > 0;
      const hasTraffic = pathStatus.bytesSent > 0;

      let errorMessage: string | undefined;
      if (!pathStatus.exists) {
        errorMessage = 'Path no existe en MediaMTX';
      } else if (!pathStatus.ready) {
        errorMessage = 'Path no está ready en MediaMTX';
      } else if (!hasTraffic) {
        errorMessage = 'No hay tráfico de datos saliente';
      }

      return {
        pathName,
        isActive,
        isStreaming,
        hasTraffic,
        errorMessage,
        lastCheck: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Error verificando output '${pathName}':`, this.formatError(error));
      return {
        pathName,
        isActive: false,
        isStreaming: false,
        hasTraffic: false,
        errorMessage: `Error de conexión: ${this.formatError(error)}`,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Verifica múltiples outputs de una vez
   * Útil para el monitoreo masivo
   */
  async verifyMultipleOutputs(pathNames: string[]): Promise<MediaMTXOutputVerification[]> {
    this.logger.debug(`🔍 Verificando ${pathNames.length} outputs en paralelo`);
    
    const verifications = await Promise.all(
      pathNames.map(pathName => this.verifyOutputStatus(pathName))
    );

    const activeCount = verifications.filter(v => v.isActive).length;
    const streamingCount = verifications.filter(v => v.isStreaming).length;
    
    this.logger.debug(`📊 Resultados: ${activeCount}/${pathNames.length} activos, ${streamingCount}/${pathNames.length} streaming`);
    
    return verifications;
  }

  /**
   * Obtiene estadísticas resumidas de todos los paths activos
   */
  async getPathsStatistics(): Promise<{
    totalPaths: number;
    readyPaths: number;
    pathsWithReaders: number;
    totalBytesReceived: number;
    totalBytesSent: number;
  }> {
    try {
      const paths = await this.listPaths();
      
      return {
        totalPaths: paths.length,
        readyPaths: paths.filter(p => p.ready).length,
        pathsWithReaders: paths.filter(p => p.readers && p.readers.length > 0).length,
        totalBytesReceived: paths.reduce((sum, p) => sum + (p.bytesReceived || 0), 0),
        totalBytesSent: paths.reduce((sum, p) => sum + (p.bytesSent || 0), 0),
      };
    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas de paths:', this.formatError(error));
      return {
        totalPaths: 0,
        readyPaths: 0,
        pathsWithReaders: 0,
        totalBytesReceived: 0,
        totalBytesSent: 0,
      };
    }
  }

  // =============================================================================
  // MONITOREO DE CONEXIONES
  // =============================================================================

  /**
   * Obtiene todas las conexiones RTMP activas
   */
  async getRTMPConnections(): Promise<MediaMTXRTMPConnectionInfo[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('/v3/rtmpconns/list')
      );
      return response.data.items || [];
    } catch (error) {
      this.logger.error('❌ Error obteniendo conexiones RTMP:', this.formatError(error));
      return [];
    }
  }

  /**
   * Obtiene todas las conexiones SRT activas
   */
  async getSRTConnections(): Promise<MediaMTXSRTConnectionInfo[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('/v3/srtconns/list')
      );
      return response.data.items || [];
    } catch (error) {
      this.logger.error('❌ Error obteniendo conexiones SRT:', this.formatError(error));
      return [];
    }
  }

  /**
   * Obtiene todas las conexiones RTSP activas
   */
  async getRTSPConnections(): Promise<MediaMTXRTSPConnectionInfo[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('/v3/rtspconns/list')
      );
      return response.data.items || [];
    } catch (error) {
      this.logger.error('❌ Error obteniendo conexiones RTSP:', this.formatError(error));
      return [];
    }
  }

  /**
   * Desconecta una conexión específica
   */
  async kickConnection(type: 'rtmp' | 'srt' | 'rtsp', connectionId: string): Promise<void> {
    this.logger.log(`🦵 Desconectando conexión ${type}: ${connectionId}`);
    
    try {
      await firstValueFrom(
        this.httpService.post(`/v3/${type}conns/kick/${connectionId}`, {})
      );
      this.logger.log(`✅ Conexión ${type}:${connectionId} desconectada exitosamente`);
    } catch (error) {
      this.logger.error(`❌ Error desconectando ${type}:${connectionId}:`, this.formatError(error));
      throw new Error(`Error desconectando conexión: ${this.formatError(error)}`);
    }
  }

  // =============================================================================
  // UTILIDADES
  // =============================================================================

  /**
   * Genera las URLs de streaming para un path
   */
  generateStreamingUrls(pathName: string): StreamingUrls {
    const serverIp = this.configService.get<string>('SERVER_IP', 'localhost');
    const rtmpPort = this.configService.get<string>('RTMP_PORT', '1935');
    const srtPort = this.configService.get<string>('SRT_PORT', '8890');
    const rtspPort = this.configService.get<string>('RTSP_PORT', '8554');
    const hlsPort = this.configService.get<string>('HLS_PORT', '8888');

    return {
      rtmp: {
        publish: `rtmp://${serverIp}:${rtmpPort}/${pathName}`,
        play: `rtmp://${serverIp}:${rtmpPort}/${pathName}`,
      },
      srt: {
        publish: `srt://${serverIp}:${srtPort}?streamid=${pathName}`,
        play: `srt://${serverIp}:${srtPort}?streamid=${pathName}`,
      },
      rtsp: {
        publish: `rtsp://${serverIp}:${rtspPort}/${pathName}`,
        play: `rtsp://${serverIp}:${rtspPort}/${pathName}`,
      },
      hls: {
        play: `http://${serverIp}:${hlsPort}/${pathName}/index.m3u8`,
      },
    };
  }

  // =============================================================================
  // MÉTODOS PRIVADOS
  // =============================================================================

  private formatError(error: any): string {
    if (error instanceof AxiosError) {
      return error.response?.data?.error || error.message;
    }
    return error.message || String(error);
  }

  private isNotFoundError(error: any): boolean {
    return error instanceof AxiosError && error.response?.status === 404;
  }

  /**
   * Obtiene estadísticas de dispositivos conectados a outputs por defecto
   * Usa APIs REST para mayor precisión en tiempo real
   */
  async getDefaultOutputsConnectionStats(streamIds: string[]): Promise<{
    hls: number;
    srt: number;
    rtmp: number;
    total: number;
  }> {
    try {
      this.logger.debug(`📊 Obteniendo estadísticas para streamIds: ${streamIds.join(', ')}`);

      // Obtener información de paths para contar lectores HLS
      const paths = await this.listPaths();
      let hlsCount = 0;
      let srtCount = 0;
      let rtmpCount = 0;

      // 1. Contar lectores HLS desde los paths
      for (const path of paths) {
        // Solo contar si el path coincide con uno de nuestros streamIds
        if (streamIds.includes(path.name)) {
          // Contar lectores de tipo hlsMuxer
          const hlsReaders = path.readers?.filter(reader => reader.type === 'hlsMuxer') || [];
          hlsCount += hlsReaders.length;
          
          this.logger.debug(`📊 Path '${path.name}': ${hlsReaders.length} lectores HLS, ready: ${path.ready}`);
        }
      }

      // 2. Contar conexiones SRT activas que lean nuestros streams
      const srtConnections = await this.getSRTConnections();
      srtCount = srtConnections.filter(conn => 
        conn.state === 'read' && 
        streamIds.some(streamId => {
          // Verificar tanto el path como el streamId
          return conn.path?.includes(streamId) || conn.streamId?.includes(streamId);
        })
      ).length;

      // 3. Contar conexiones RTMP activas que lean nuestros streams
      const rtmpConnections = await this.getRTMPConnections();
      rtmpCount = rtmpConnections.filter(conn => 
        conn.state === 'read' && 
        streamIds.some(streamId => conn.path?.includes(streamId))
      ).length;

      const total = hlsCount + srtCount + rtmpCount;

      this.logger.log(`📊 Estadísticas de conexiones: HLS=${hlsCount}, SRT=${srtCount}, RTMP=${rtmpCount}, Total=${total}`);
      
      // Log detallado para debugging
      if (hlsCount > 0) {
        this.logger.debug(`📊 Detalle HLS: ${hlsCount} muxers activos`);
      }
      if (srtCount > 0) {
        this.logger.debug(`📊 Detalle SRT: ${srtCount} conexiones de lectura`);
      }
      if (rtmpCount > 0) {
        this.logger.debug(`📊 Detalle RTMP: ${rtmpCount} conexiones de lectura`);
      }

      return {
        hls: hlsCount,
        srt: srtCount,
        rtmp: rtmpCount,
        total: total
      };
      
    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas de outputs por defecto:', this.formatError(error));
      throw new Error(`Error obteniendo estadísticas: ${this.formatError(error)}`);
    }
  }
} 