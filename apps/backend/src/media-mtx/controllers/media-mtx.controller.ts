import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Logger,
  HttpException,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { MediaMTXApiService } from '../services/core/mediamtx-api.service';
import { StreamIntegrationService } from '../services/integration/stream-integration.service';
import { CreatePathDto, UpdatePathDto, ConnectionKickDto, MediaMTXStatusDto } from '../dto/path-management.dto';
import { Response } from 'express';
import * as http from 'http';

/**
 * Controlador principal para MediaMTX
 * Expone endpoints REST para gestión de paths, conexiones y monitoreo
 */
@Controller('media-mtx')
export class MediaMTXController {
  private readonly logger = new Logger(MediaMTXController.name);

  constructor(
    private readonly apiService: MediaMTXApiService,
    private readonly integrationService: StreamIntegrationService,
  ) {}

  // =============================================================================
  // ESTADO Y CONEXIÓN
  // =============================================================================

  @Get('status')
  async getStatus(): Promise<MediaMTXStatusDto> {
    try {
      const connected = await this.apiService.testConnection();
      return {
        connected,
        message: connected ? 'Conectado a MediaMTX' : 'Error de conexión con MediaMTX',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error obteniendo estado:', error.message);
      return {
        connected: false,
        message: 'Error de conexión con MediaMTX',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('metrics')
  async getSystemMetrics() {
    try {
      const metrics = await this.integrationService.getSystemMetrics();
      return {
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error obteniendo métricas:', error.message);
      throw new HttpException(
        'Error obteniendo métricas del sistema',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =============================================================================
  // GESTIÓN DE PATHS
  // =============================================================================

  @Get('paths')
  async listPaths() {
    try {
      const paths = await this.apiService.listPaths();
      return {
        success: true,
        count: paths.length,
        data: paths,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error obteniendo paths:', error.message);
      throw new HttpException(
        'Error obteniendo paths de MediaMTX',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('paths/:name')
  async getPath(@Param('name') name: string) {
    try {
      const path = await this.apiService.getPath(name);
      if (!path) {
        throw new HttpException('Path no encontrado', HttpStatus.NOT_FOUND);
      }
      
      return {
        success: true,
        data: path,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error obteniendo path ${name}:`, error.message);
      throw new HttpException(
        'Error obteniendo path de MediaMTX',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('paths/:name/status')
  async getPathStatus(@Param('name') name: string) {
    try {
      const status = await this.integrationService.getInputStatus(name);
      return {
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estado del path ${name}:`, error.message);
      throw new HttpException(
        'Error obteniendo estado del path',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('paths/:name')
  async createPath(@Param('name') name: string, @Body() config: CreatePathDto) {
    try {
      await this.apiService.createPath(name, config);
      const urls = this.apiService.generateStreamingUrls(name);
      
      return {
        success: true,
        message: `Path '${name}' creado exitosamente`,
        data: { urls },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error creando path ${name}:`, error.message);
      throw new HttpException(
        error.message || 'Error creando path en MediaMTX',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('paths/:name')
  async updatePath(@Param('name') name: string, @Body() config: UpdatePathDto) {
    try {
      await this.apiService.updatePath(name, config);
      return {
        success: true,
        message: `Path '${name}' actualizado exitosamente`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error actualizando path ${name}:`, error.message);
      throw new HttpException(
        error.message || 'Error actualizando path en MediaMTX',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('paths/:name')
  async deletePath(@Param('name') name: string) {
    try {
      await this.apiService.deletePath(name);
      return {
        success: true,
        message: `Path '${name}' eliminado exitosamente`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error eliminando path ${name}:`, error.message);
      throw new HttpException(
        error.message || 'Error eliminando path en MediaMTX',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('paths/:name/urls')
  async generateUrls(@Param('name') pathName: string) {
    try {
      const urls = this.apiService.generateStreamingUrls(pathName);
      return {
        success: true,
        data: urls,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error generando URLs para path ${pathName}:`, error.message);
      throw new HttpException(
        'Error generando URLs de streaming',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =============================================================================
  // MONITOREO DE CONEXIONES
  // =============================================================================

  @Get('connections/rtmp')
  async getRTMPConnections() {
    try {
      const connections = await this.apiService.getRTMPConnections();
      return {
        success: true,
        count: connections.length,
        data: connections,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error obteniendo conexiones RTMP:', error.message);
      throw new HttpException(
        'Error obteniendo conexiones RTMP',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('connections/srt')
  async getSRTConnections() {
    try {
      const connections = await this.apiService.getSRTConnections();
      return {
        success: true,
        count: connections.length,
        data: connections,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error obteniendo conexiones SRT:', error.message);
      throw new HttpException(
        'Error obteniendo conexiones SRT',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('connections/rtsp')
  async getRTSPConnections() {
    try {
      const connections = await this.apiService.getRTSPConnections();
      return {
        success: true,
        count: connections.length,
        data: connections,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error obteniendo conexiones RTSP:', error.message);
      throw new HttpException(
        'Error obteniendo conexiones RTSP',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('connections/:type/kick/:id')
  async kickConnection(
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    if (!['rtmp', 'srt', 'rtsp'].includes(type)) {
      throw new HttpException(
        'Tipo de conexión inválido. Debe ser: rtmp, srt o rtsp',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.apiService.kickConnection(type as 'rtmp' | 'srt' | 'rtsp', id);
      return {
        success: true,
        message: `Conexión ${type}:${id} desconectada exitosamente`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error desconectando ${type}:${id}:`, error.message);
      throw new HttpException(
        error.message || 'Error desconectando conexión',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =============================================================================
  // OPERACIONES DE MANTENIMIENTO
  // =============================================================================

  @Post('sync')
  async syncStates() {
    try {
      await this.integrationService.syncAllStates();
      return {
        success: true,
        message: 'Sincronización completada exitosamente',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error en sincronización:', error.message);
      throw new HttpException(
        'Error en sincronización de estados',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cleanup')
  async cleanupOrphanedPaths() {
    try {
      const cleaned = await this.integrationService.cleanupOrphanedPaths();
      return {
        success: true,
        message: `Limpieza completada: ${cleaned} paths eliminados`,
        data: { cleanedPaths: cleaned },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error en limpieza:', error.message);
      throw new HttpException(
        'Error en limpieza de paths huérfanos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
} 