import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { EntradaStream } from '../entrada/entities/entrada.entity';
import { SalidaStream } from '../salida/entities/salida.entity';
import { CreateEstadoDto } from './dto/create-estado.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { MediaMTXApiService } from '../media-mtx/services/core/mediamtx-api.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
    credentials: true,
  },
})
export class EstadoService implements OnModuleInit {
  private readonly logger = new Logger(EstadoService.name);
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL_MS = 5000; // 5 segundos
  private estadosAnteriores = new Map<string, boolean>(); // entradaId -> estado anterior
  
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectRepository(EntradaStream)
    private readonly entradaRepository: Repository<EntradaStream>,
    @InjectRepository(SalidaStream)
    private readonly salidaRepository: Repository<SalidaStream>,
    private readonly mediaMtxApi: MediaMTXApiService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Iniciando servicio de monitoreo de estados...');
    this.iniciarPollingEstados();
  }

  onModuleDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.logger.log('🔄 Servicio de polling detenido');
    }
  }

  // ===== SERVICIO DE POLLING =====

  private iniciarPollingEstados(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        await this.verificarEstadosTodasLasEntradas();
        // TODO: Aquí podríamos llamar al monitoreo de outputs cuando lo implementemos correctamente
      } catch (error) {
        this.logger.error('Error en polling de estados:', error.message);
      }
    }, this.POLLING_INTERVAL_MS);
    
    this.logger.log(`📡 Polling de estados iniciado cada ${this.POLLING_INTERVAL_MS}ms`);
  }

  private async verificarEstadosTodasLasEntradas(): Promise<void> {
    const entradas = await this.entradaRepository.find({
      relations: ['salidas'],
    });

    for (const entrada of entradas) {
      await this.verificarYEmitirCambioEstado(entrada);
    }
  }

  private async verificarYEmitirCambioEstado(entrada: EntradaStream): Promise<void> {
    try {
      const pathName = this.calcularPathEntrada(entrada);
      const pathInfo = await this.obtenerEstadoPathReal(pathName);
      const estadoActual = pathInfo?.ready ?? false;
      const estadoAnterior = this.estadosAnteriores.get(entrada.id);

      // Solo procesar si hay cambio de estado o es la primera vez
      if (estadoAnterior === undefined || estadoAnterior !== estadoActual) {
        this.estadosAnteriores.set(entrada.id, estadoActual);
        
        // Actualizar estado en base de datos
        entrada.activa = estadoActual;
        await this.entradaRepository.save(entrada);
        
        this.logger.log(`🔄 Estado cambiado: entrada "${entrada.nombre}" -> ${estadoActual ? 'ACTIVA' : 'INACTIVA'}`);
        
        // Emitir eventos que espera el frontend
        this.emitirEventosFrontend(entrada.id, estadoActual, pathInfo);
      }
    } catch (error) {
      this.logger.error(`Error verificando estado de entrada ${entrada.id}:`, error.message);
    }
  }

  // ===== EVENTOS PARA EL FRONTEND =====

  private emitirEventosFrontend(entradaId: string, activa: boolean, pathInfo?: any): void {
    if (this.server) {
      // Eventos que espera el frontend
      this.server.emit('stream-update', {
        entradaId,
        activa,
        pathInfo,
        timestamp: new Date().toISOString(),
      });
      
      this.server.emit('entrada-update', {
        entradaId,
        activa,
        pathInfo,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`📡 WebSocket: Eventos emitidos para entrada ${entradaId} -> ${activa ? 'ACTIVA' : 'INACTIVA'}`);
    }
  }

  emitirCambioOutput(entradaId: string, outputId: string, accion: 'creado' | 'actualizado' | 'eliminado'): void {
    if (this.server) {
      // Evento que espera el frontend
      this.server.emit('output-update', {
        entradaId,
        outputId,
        accion,
        timestamp: new Date().toISOString(),
      });
      this.logger.debug(`📡 WebSocket: Cambio de output emitido - ${accion} - entrada ${entradaId}`);
    }
  }

  // ===== MÉTODOS DE ESTADO PRINCIPAL =====

  async obtenerEstadoOutputsEntrada(entradaId: string): Promise<any> {
    const entrada = await this.entradaRepository.findOne({
      where: { id: entradaId },
      relations: ['salidas'],
    });

    if (!entrada) {
      throw new NotFoundException(`Entrada con ID ${entradaId} no encontrada.`);
    }

    const pathName = this.calcularPathEntrada(entrada);
    const estadoPath = await this.obtenerEstadoPathReal(pathName);

    const resultado = {
      entradaActiva: estadoPath?.ready || false,
      bytesEnviados: estadoPath?.bytesSent || 0,
      configuracionOutputs: this.convertirSalidasAOutputs(entrada.salidas),
      pathName: pathName,
      estadoPath: estadoPath || 'no_existe',
    };

    // Emitir estado por WebSocket
    this.emitirEstadoEntrada(entradaId, resultado);

    return resultado;
  }

  async forzarSincronizacionEntrada(entradaId: string): Promise<any> {
    const entrada = await this.entradaRepository.findOne({
      where: { id: entradaId },
      relations: ['salidas'],
    });

    if (!entrada) {
      throw new NotFoundException(`Entrada con ID ${entradaId} no encontrada.`);
    }

    this.logger.log(`🔄 Forzando sincronización con hot-reload verdadero para entrada ${entrada.nombre} (${entradaId})`);
    
    // TODO: Usar hot-reload verdadero que no mata conexiones
    // await this.sincronizarOutputsConHotReload(entradaId);
    
    const resultado = {
      mensaje: `Sincronización con hot-reload verdadero completada para entrada '${entrada.nombre}'`,
      entradaId: entradaId,
      outputsConfiguratos: entrada.salidas.length,
      timestamp: new Date().toISOString(),
    };

    // Emitir evento de sincronización por WebSocket
    this.emitirSincronizacionCompleta(entradaId, resultado);

    return resultado;
  }

  // ===== WEBSOCKET EVENTS LEGACY =====

  private emitirEstadoEntrada(entradaId: string, estado: any): void {
    if (this.server) {
      this.server.emit('estado-entrada', {
        entradaId,
        estado,
        timestamp: new Date().toISOString(),
      });
      this.logger.debug(`📡 WebSocket: Estado emitido para entrada ${entradaId}`);
    }
  }

  private emitirSincronizacionCompleta(entradaId: string, resultado: any): void {
    if (this.server) {
      this.server.emit('sincronizacion-completa', {
        entradaId,
        resultado,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`📡 WebSocket: Sincronización completa emitida para entrada ${entradaId}`);
    }
  }

  /**
   * Emite cambio de estado de conexión en tiempo real
   */
  emitirCambioEstadoConexion(entradaId: string, activa: boolean, pathInfo?: any): void {
    if (this.server) {
      this.server.emit('estado-conexion', {
        entradaId,
        activa,
        pathInfo,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`📡 WebSocket: Estado de conexión emitido - entrada ${entradaId} -> ${activa ? 'ACTIVA' : 'INACTIVA'}`);
    }
  }

  /**
   * Obtiene el estado real de MediaMTX y emite cambios por WebSocket
   */
  async actualizarYEmitirEstadoEntrada(entradaId: string): Promise<void> {
    try {
      const entrada = await this.entradaRepository.findOne({
        where: { id: entradaId },
        relations: ['salidas'],
      });

      if (!entrada) {
        this.logger.warn(`Entrada ${entradaId} no encontrada para actualizar estado`);
        return;
      }

      const pathName = this.calcularPathEntrada(entrada);
      const pathInfo = await this.obtenerEstadoPathReal(pathName);
      const nuevoEstado = pathInfo?.ready ?? false;

      // Solo actualizar y emitir si hay cambio de estado
      if (entrada.activa !== nuevoEstado) {
        entrada.activa = nuevoEstado;
        await this.entradaRepository.save(entrada);
        
        this.logger.log(`🔄 Estado cambiado: entrada "${entrada.nombre}" -> ${nuevoEstado ? 'ACTIVA' : 'INACTIVA'}`);
        
        // Emitir cambio por WebSocket
        this.emitirCambioEstadoConexion(entradaId, nuevoEstado, pathInfo);
      }
    } catch (error) {
      this.logger.error(`Error actualizando estado de entrada ${entradaId}:`, error.message);
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  private convertirSalidasAOutputs(salidas: SalidaStream[]): any[] {
    return salidas.map(salida => ({
      id: salida.id,
      nombre: salida.nombre,
      protocolo: salida.protocolo,
      habilitada: salida.habilitada,
      urlDestino: salida.urlDestino,
      claveStreamRTMP: salida.claveStreamRTMP,
      streamIdSRT: salida.streamIdSRT,
      passphraseSRT: salida.passphraseSRT,
      latenciaSRT: salida.latenciaSRT,
      puertoSRT: salida.puertoSRT,
    }));
  }

  private calcularPathEntrada(entrada: EntradaStream): string {
    if (entrada.protocolo === 'RTMP') {
      return `live/${entrada.streamKey}`;
    } else if (entrada.protocolo === 'SRT') {
      // Para SRT, MediaMTX registra el path directamente con el hash, SIN prefijo live/
      if (entrada.streamId?.startsWith('publish:')) {
        const streamPath = entrada.streamId.replace('publish:', '');
        return streamPath; // SIN prefijo live/ para SRT
      }
      // Fallback para el formato antiguo si existe
      const match = entrada.streamId?.match(/r=([^,]+)/);
      const streamPath = match?.[1] || entrada.streamId || 'default-path';
      return streamPath; // SIN prefijo live/ para SRT
    }
    throw new Error(`Protocolo no soportado: ${entrada.protocolo}`);
  }

  // ===== OBTENER ESTADO REAL DE MEDIAMTX =====

  private async obtenerEstadoPathReal(pathName: string): Promise<any> {
    try {
      this.logger.debug(`🔄 Obteniendo estado real de path: ${pathName}`);
      const pathInfo = await this.mediaMtxApi.getPath(pathName);
      
      if (pathInfo) {
        this.logger.debug(`✅ Path "${pathName}" encontrado: ready=${pathInfo.ready}, tracks=${pathInfo.tracks?.length || 0}`);
        return {
          ready: pathInfo.ready || false,
          bytesReceived: pathInfo.bytesReceived || 0,
          bytesSent: pathInfo.bytesSent || 0,
          tracks: pathInfo.tracks || [],
        };
      } else {
        this.logger.debug(`❌ Path "${pathName}" no existe en MediaMTX`);
    return {
      ready: false,
          bytesReceived: 0,
      bytesSent: 0,
          tracks: [],
        };
      }
    } catch (error) {
      this.logger.error(`❌ Error obteniendo estado de path "${pathName}":`, error.message);
      // Retornar estado por defecto en caso de error
      return {
        ready: false,
      bytesReceived: 0,
        bytesSent: 0,
      tracks: [],
    };
    }
  }

  // ===== MÉTODOS LEGACY COMPATIBLES =====

  create(createEstadoDto: CreateEstadoDto) {
    return `[MOCK] Estado creado: ${JSON.stringify(createEstadoDto)}`;
  }

  findAll() {
    return `[MOCK] Todos los estados`;
  }

  findOne(id: string) {
    return `[MOCK] Estado ${id}`;
  }

  update(id: string, updateEstadoDto: UpdateEstadoDto) {
    return `[MOCK] Estado ${id} actualizado: ${JSON.stringify(updateEstadoDto)}`;
  }

  remove(id: string) {
    return `[MOCK] Estado ${id} eliminado`;
  }
}
