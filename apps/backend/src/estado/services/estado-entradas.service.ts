import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { EntradaStream } from '../../entrada/entities/entrada.entity';
import { MediaMTXApiService } from '../../media-mtx/services/core/mediamtx-api.service';

@Injectable()
export class EstadoEntradasService {
  private readonly logger = new Logger(EstadoEntradasService.name);
  
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectRepository(EntradaStream)
    private readonly entradaRepository: Repository<EntradaStream>,
    private readonly mediaMTXApiService: MediaMTXApiService,
  ) {}

  /**
   * Verifica el estado de todas las entradas
   */
  async verificarEstadosEntradas(): Promise<void> {
    try {
      const entradas = await this.entradaRepository.find();
      
      for (const entrada of entradas) {
        await this.verificarEstadoEntrada(entrada);
      }
    } catch (error) {
      this.logger.error('Error verificando estados de entradas:', error.message);
    }
  }

  /**
   * Verifica el estado de una entrada específica
   */
  async verificarEstadoEntrada(entrada: EntradaStream): Promise<void> {
    try {
      const pathName = this.calcularPathEntrada(entrada);
      const estadoAnterior = entrada.activa;
      
      this.logger.debug(`🔍 Verificando entrada "${entrada.nombre}" (path: ${pathName})`);
      
      // Consultar MediaMTX para ver si el path está activo
      const pathInfo = await this.mediaMTXApiService.getPath(pathName);
      const estadoActual = pathInfo?.ready || false;
      
      this.logger.debug(`📊 Entrada "${entrada.nombre}": ready=${estadoActual}, bytesReceived=${pathInfo?.bytesReceived || 0}`);
      
      // Solo actualizar si el estado cambió
      if (estadoAnterior !== estadoActual) {
        await this.entradaRepository.update(entrada.id, { activa: estadoActual });
        
        const emoji = estadoActual ? '🟢' : '🔴';
        this.logger.log(`${emoji} Entrada "${entrada.nombre}": ${estadoAnterior ? 'activa' : 'inactiva'} → ${estadoActual ? 'activa' : 'inactiva'}`);
        
        // Emitir evento WebSocket
        this.emitirCambioEntrada(entrada.id, estadoActual, pathInfo);
      }
    } catch (error) {
      this.logger.error(`Error verificando entrada ${entrada.id}:`, error.message);
    }
  }

  /**
   * Calcula el nombre del path en MediaMTX para una entrada
   */
  private calcularPathEntrada(entrada: EntradaStream): string {
    switch (entrada.protocolo) {
      case 'SRT':
        // Remover el prefijo "publish:" si existe
        const streamId = entrada.streamId || entrada.nombre.toLowerCase().replace(/\s+/g, '_');
        return streamId.replace(/^publish:/, '');
      case 'RTMP':
        return entrada.streamKey || entrada.nombre.toLowerCase().replace(/\s+/g, '_');
      default:
        return entrada.nombre.toLowerCase().replace(/\s+/g, '_');
    }
  }

  /**
   * Emite evento WebSocket cuando cambia el estado de una entrada
   */
  private emitirCambioEntrada(entradaId: string, activa: boolean, pathInfo: any): void {
    try {
      if (this.server) {
        // Evento específico para cambios de entrada
        this.server.emit('input-status-change', {
          entradaId,
          activa,
          pathInfo: pathInfo ? {
            ready: pathInfo.ready,
            bytesReceived: pathInfo.bytesReceived,
            bytesSent: pathInfo.bytesSent,
            tracks: pathInfo.tracks
          } : null,
          timestamp: new Date().toISOString(),
        });

        this.logger.debug(`📡 WebSocket: input-status-change emitido para entrada ${entradaId} (activa: ${activa})`);
      }
    } catch (error) {
      this.logger.error('Error emitiendo cambio de entrada:', error.message);
    }
  }

  /**
   * Obtiene el estado actual de todas las entradas
   */
  async obtenerEstadoGeneral(): Promise<any> {
    try {
      const entradas = await this.entradaRepository.find({
        relations: ['salidas'],
        order: { position: 'ASC', salidas: { position: 'ASC' } },
      });

      return {
        entradas: entradas.map((entrada) => ({
          id: entrada.id,
          nombre: entrada.nombre,
          protocolo: entrada.protocolo,
          activa: entrada.activa,
          url: entrada.url || null,
          streamId: entrada.streamId || null,
          streamKey: entrada.streamKey || null,
          salidas: entrada.salidas?.map((salida) => ({
            id: salida.id,
            nombre: salida.nombre,
            habilitada: salida.habilitada,
            estado: salida.estado,
            urlDestino: salida.urlDestino,
            position: salida.position,
          })),
        })),
      };
    } catch (error) {
      this.logger.error('Error obteniendo estado general:', error.message);
      return { entradas: [] };
    }
  }
} 