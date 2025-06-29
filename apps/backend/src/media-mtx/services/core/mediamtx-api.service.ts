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
} 