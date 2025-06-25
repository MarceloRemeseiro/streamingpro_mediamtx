import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaMTXService, OutputPersonalizado, OutputRTMP, OutputSRT, OutputHLS } from '../mediamtx/mediamtx.service';
import { CrearEntradaDto } from './dto/crear-entrada.dto';
import { ActualizarEntradaDto } from './dto/actualizar-entrada.dto';
import { CrearSalidaDto } from './dto/crear-salida.dto';
import { ActualizarSalidaDto } from './dto/actualizar-salida.dto';
import { ProtocoloStream, ProtocoloSalida, EntradaStream, SalidaStream } from '../prisma/generated/client';
import { randomBytes } from 'crypto';
import { getStreamingUrlGenerator } from '../config/streaming.config';
import { Logger } from '@nestjs/common';

@Injectable()
export class StreamsService {
  private urlGenerator = getStreamingUrlGenerator();
  private readonly logger = new Logger(StreamsService.name);

  constructor(
    private prisma: PrismaService,
    private mediaMTXService: MediaMTXService,
  ) {}

  // ===== MÉTODOS HELPER =====
  
  private convertirSalidasAOutputs(salidas: SalidaStream[]): OutputPersonalizado[] {
    this.logger.log(`🔄 DEBUGGING - Convirtiendo ${salidas.length} salidas a outputs:`);
    
    const outputs = salidas.map(salida => {
      this.logger.log(`📋 Procesando salida: ${JSON.stringify({
        id: salida.id,
        nombre: salida.nombre,
        protocolo: salida.protocolo,
        urlDestino: salida.urlDestino,
        passphraseSRT: salida.passphraseSRT,
        streamIdSRT: salida.streamIdSRT,
        latenciaSRT: salida.latenciaSRT,
        claveStreamRTMP: salida.claveStreamRTMP,
        habilitada: salida.habilitada
      }, null, 2)}`);
      
      const outputBase = {
        id: salida.id,
        nombre: salida.nombre,
        protocolo: salida.protocolo,
        habilitada: salida.habilitada,
        urlDestino: salida.urlDestino || '',
      };

      let resultado;
      switch (salida.protocolo) {
        case ProtocoloSalida.RTMP:
          resultado = { ...outputBase, claveStreamRTMP: salida.claveStreamRTMP } as OutputRTMP;
          break;
        case ProtocoloSalida.SRT:
          resultado = { ...outputBase, passphraseSRT: salida.passphraseSRT, latenciaSRT: salida.latenciaSRT, streamIdSRT: salida.streamIdSRT } as OutputSRT;
          break;
        case ProtocoloSalida.HLS:
          // Nota: El output HLS vía FFmpeg es un caso de uso avanzado. Por ahora, se mantiene la estructura.
          resultado = { ...outputBase, segmentDuration: salida.segmentDuration } as OutputHLS;
          break;
        default:
          this.logger.warn(`Protocolo de salida no soportado durante la conversión: ${salida.protocolo}`);
          return null;
      }
      
      this.logger.log(`✅ Output convertido: ${JSON.stringify(resultado, null, 2)}`);
      return resultado;
    }).filter(output => output !== null);
    
    this.logger.log(`🎯 Total outputs convertidos: ${outputs.length}`);
    return outputs;
  }

  private async sincronizarEntradaCompleta(entradaId: string): Promise<void> {
    try {
      const entrada = await this.prisma.entradaStream.findUnique({
        where: { id: entradaId },
        include: { salidas: true },
      });

      if (!entrada) {
        this.logger.error(`No se pudo sincronizar: Entrada con ID ${entradaId} no encontrada.`);
        return;
      }

      const outputs = this.convertirSalidasAOutputs(entrada.salidas);
      await this.mediaMTXService.configurarOutputsNativo(entrada, outputs);

    } catch (error) {
      this.logger.error(`Error al sincronizar entrada completa ${entradaId}:`, error.message);
    }
  }

  /**
   * Sincroniza outputs usando HOT-RELOAD VERDADERO que preserva el HLS
   */
  private async sincronizarOutputsConHotReload(entradaId: string): Promise<void> {
    try {
      // Obtener la entrada con sus salidas
      const entrada = await this.prisma.entradaStream.findUnique({
        where: { id: entradaId },
        include: { salidas: true },
      });

      if (!entrada) {
        throw new NotFoundException(`Entrada con ID ${entradaId} no encontrada.`);
      }

      this.logger.log(`🔥 HOT-RELOAD VERDADERO para entrada '${entrada.nombre}' (${entrada.salidas.length} outputs)`);
      this.logger.log(`🛡️ Preservando stream HLS y configuración de MediaMTX`);

      const outputs = this.convertirSalidasAOutputs(entrada.salidas);
      
      // Usar HOT-RELOAD VERDADERO que NO toca la configuración de MediaMTX
      await this.mediaMTXService.configurarOutputsHotReload(entrada, outputs);

      this.logger.log(`✅ Hot-reload verdadero completado para '${entrada.nombre}' - HLS preservado`);

    } catch (error) {
      this.logger.error(`❌ Error en hot-reload verdadero: ${error.message}`);
      throw error;
    }
  }

  // ===== MÉTODOS PARA ENTRADAS =====

  /**
   * Crea los 3 outputs por defecto para una entrada: HLS, SRT Pull y RTMP Pull
   * Todos configurados para funcionar en VLC con baja latencia
   */
  private async crearOutputsPorDefecto(entradaId: string): Promise<void> {
    try {
      const entrada = await this.prisma.entradaStream.findUnique({
        where: { id: entradaId }
      });

      if (!entrada) {
        this.logger.error(`No se puede crear outputs por defecto: Entrada ${entradaId} no encontrada`);
        return;
      }

      const pathName = this.mediaMTXService.calcularPathEntrada(entrada);

      // 1. HLS - URL para consumo directo (misma que usa el frontend)
      await this.prisma.salidaStream.create({
        data: {
          nombre: 'HLS',
          protocolo: ProtocoloSalida.HLS,
          entradaId,
          habilitada: true, // Siempre disponible
          urlDestino: this.urlGenerator.generateHlsUrl(pathName), // URL HLS real
        }
      });

      // 2. SRT Caller - URL para consumo directo desde VLC (formato MediaMTX)
      await this.prisma.salidaStream.create({
        data: {
          nombre: 'SRT Pull',
          protocolo: ProtocoloSalida.SRT,
          entradaId,
          habilitada: true, // Siempre disponible
          urlDestino: `srt://localhost:8890?streamid=read:${pathName}`,
          puertoSRT: 8890, // Mismo puerto que la entrada
          latenciaSRT: 40,
        }
      });

      // 3. RTMP - URL para consumo directo desde VLC (path directo)
      await this.prisma.salidaStream.create({
        data: {
          nombre: 'RTMP Pull',
          protocolo: ProtocoloSalida.RTMP,
          entradaId,
          habilitada: true, // Siempre disponible
          urlDestino: `rtmp://localhost:1935/${pathName}`, // Path directo sin .stream
        }
      });

      this.logger.log(`Outputs por defecto creados para entrada '${entrada.nombre}': HLS, SRT Pull, RTMP Pull`);

    } catch (error) {
      this.logger.error(`Error al crear outputs por defecto para entrada ${entradaId}:`, error.message);
    }
  }
  
  async crearEntrada(crearEntradaDto: CrearEntradaDto): Promise<EntradaStream> {
    let datosEntrada: any = {
      nombre: crearEntradaDto.nombre,
      protocolo: crearEntradaDto.protocolo,
    };

    if (crearEntradaDto.protocolo === ProtocoloStream.RTMP) {
      const streamKey = this.generarClaveUnica();
      datosEntrada = {
        ...datosEntrada,
        streamKey,
        url: this.urlGenerator.generateRtmpUrl(streamKey),
      };
    } else if (crearEntradaDto.protocolo === ProtocoloStream.SRT) {
      const streamPath = this.generarClaveUnica();
      // Formato simple compatible con OBS y MediaMTX
      const streamId = `publish:${streamPath}`;
      const passphraseSRT = crearEntradaDto.incluirPassphrase ? this.generarClaveUnica() : undefined;
      
      datosEntrada = {
        ...datosEntrada,
        puertoSRT: 8890,
        latenciaSRT: crearEntradaDto.latenciaSRT || 200,
        streamId,
        passphraseSRT,
        url: this.urlGenerator.generateSrtUrl(streamId, passphraseSRT),
      };
    }

    const entrada = await this.prisma.entradaStream.create({ data: datosEntrada });

    // Crear outputs por defecto automáticamente
    await this.crearOutputsPorDefecto(entrada.id);

    // Crea la configuración del path en MediaMTX de forma preventiva, con outputs por defecto.
    await this.sincronizarEntradaCompleta(entrada.id);

    return entrada;
  }

  async obtenerEntradas() {
    const entradas = await this.prisma.entradaStream.findMany({
      include: { salidas: true },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      entradas.map(async (entrada) => {
        try {
          const pathName = this.mediaMTXService.calcularPathEntrada(entrada);
          const estadoPath = await this.mediaMTXService.getEstadoPath(pathName);
          const hlsUrl = this.urlGenerator.generateHlsUrl(pathName);
          
          return {
            ...entrada,
            activo: estadoPath?.ready || false,
            hlsUrl,
            pathName,
            estadisticas: {
              bytesRecibidos: estadoPath?.bytesReceived || 0,
              bytesEnviados: estadoPath?.bytesSent || 0,
            },
          };
        } catch (error) {
          this.logger.warn(`No se pudo obtener estado de MediaMTX para entrada ${entrada.id}: ${error.message}`);
          return { ...entrada, activo: false, hlsUrl: '', pathName: '', estadisticas: null };
        }
      })
    );
  }

  async obtenerEntradaPorId(id: string) {
    const entrada = await this.prisma.entradaStream.findUnique({
      where: { id },
      include: {
        salidas: true,
      },
    });

    if (!entrada) {
      throw new NotFoundException(`Entrada con ID ${id} no encontrada`);
    }

    return entrada;
  }

  async actualizarEntrada(id: string, actualizarEntradaDto: ActualizarEntradaDto) {
    // Verificar que la entrada existe
    const entradaExistente = await this.obtenerEntradaPorId(id);

    // Solo permitir actualizar nombre y latencia para SRT
    let datosActualizacion: any = {
      nombre: actualizarEntradaDto.nombre,
    };

    // Si es SRT y se actualiza la latencia
    if (entradaExistente.protocolo === ProtocoloStream.SRT && actualizarEntradaDto.latenciaSRT) {
      datosActualizacion.latenciaSRT = actualizarEntradaDto.latenciaSRT;
    }

    return this.prisma.entradaStream.update({
      where: { id },
      data: datosActualizacion,
      include: {
        salidas: true,
      },
    });
  }

  async eliminarEntrada(id: string): Promise<void> {
    const entrada = await this.prisma.entradaStream.findUnique({ where: { id } });
    if (!entrada) {
      throw new NotFoundException(`Entrada con ID ${id} no encontrada para eliminar.`);
    }

    // Elimina la configuración del path y sus outputs de MediaMTX
    await this.mediaMTXService.eliminarEntradaConOutputs(entrada);

    // Luego elimina de la base de datos
    await this.prisma.entradaStream.delete({ where: { id } });
  }

  // ===== MÉTODOS PARA SALIDAS =====

  async crearSalida(entradaId: string, crearSalidaDto: CrearSalidaDto): Promise<SalidaStream> {
    const entrada = await this.prisma.entradaStream.findUnique({
      where: { id: entradaId },
    });
    if (!entrada) {
      throw new NotFoundException(`Entrada con ID ${entradaId} no encontrada.`);
    }

    const nuevaSalida = await this.prisma.salidaStream.create({
      data: { 
        ...crearSalidaDto, 
        entradaId,
        habilitada: crearSalidaDto.habilitada ?? false
      },
    });
    
    // Sincronización nativa simple al crear
    await this.sincronizarOutputsConHotReload(entradaId);
    
    return nuevaSalida;
  }

  async obtenerSalidas() {
    return this.prisma.salidaStream.findMany({
      include: {
        entrada: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async obtenerOutputsPorStreamKey(streamKey: string) {
    // Buscar la entrada por streamKey
    const entrada = await this.prisma.entradaStream.findFirst({
      where: { streamKey },
      include: {
        salidas: true,
      },
    });

    if (!entrada) {
      return [];
    }

    // Retornar solo las salidas en el formato que espera el script gestor
    return entrada.salidas.map(salida => {
      let urlDestino = salida.urlDestino;
      
      // Para outputs SRT, construir la URL completa con puerto, passphrase y streamid
      if (salida.protocolo === ProtocoloSalida.SRT && salida.puertoSRT) {
        const url = new URL(salida.urlDestino);
        url.port = salida.puertoSRT.toString();
        
        const params = new URLSearchParams();
        if (salida.passphraseSRT) {
          params.append('passphrase', salida.passphraseSRT);
        }
        if (salida.streamIdSRT) {
          params.append('streamid', salida.streamIdSRT);
        }
        if (salida.latenciaSRT) {
          params.append('latency', salida.latenciaSRT.toString());
        }
        
        url.search = params.toString();
        urlDestino = url.toString();
      }
      
      return {
        id: salida.id,
        nombre: salida.nombre,
        habilitada: salida.habilitada,
        protocolo: salida.protocolo,
        urlDestino: urlDestino,
        claveStreamRTMP: salida.claveStreamRTMP,
        streamIdSRT: salida.streamIdSRT,
      };
    });
  }

  async obtenerSalidasPorEntrada(entradaId: string) {
    // Verificar que la entrada existe
    await this.obtenerEntradaPorId(entradaId);

    return this.prisma.salidaStream.findMany({
      where: { entradaId },
      include: {
        entrada: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async obtenerSalidaPorId(id: string) {
    const salida = await this.prisma.salidaStream.findUnique({
      where: { id },
      include: {
        entrada: true,
      },
    });

    if (!salida) {
      throw new NotFoundException(`Salida con ID ${id} no encontrada`);
    }

    return salida;
  }

  async actualizarSalida(id: string, actualizarSalidaDto: ActualizarSalidaDto): Promise<SalidaStream> {
    const salidaExistente = await this.prisma.salidaStream.findUnique({
      where: { id },
      include: { entrada: true } 
    });
    if (!salidaExistente) {
      throw new NotFoundException(`Salida con ID ${id} no encontrada.`);
    }

    const salidaActualizada = await this.prisma.salidaStream.update({
      where: { id },
      data: actualizarSalidaDto,
      include: { entrada: true }
    });

    // Sincronización nativa simple al actualizar
    await this.sincronizarOutputsConHotReload(salidaActualizada.entradaId);
    
    return salidaActualizada;
  }

  async eliminarSalida(id: string): Promise<void> {
    const salidaExistente = await this.prisma.salidaStream.findUnique({ 
      where: { id },
      include: { entrada: true }
    });
    if (!salidaExistente) {
      throw new NotFoundException(`Salida con ID ${id} no encontrada.`);
    }

    const entradaId = salidaExistente.entradaId;
    
    // Eliminar de la base de datos
    await this.prisma.salidaStream.delete({ where: { id } });
    
    // Sincronización nativa simple al eliminar
    await this.sincronizarOutputsConHotReload(entradaId);
  }

  // ===== MÉTODOS DE ESTADO Y ESTADÍSTICAS =====

  async obtenerEstadoOutputsEntrada(entradaId: string): Promise<any> {
    const entrada = await this.prisma.entradaStream.findUnique({
      where: { id: entradaId },
      include: { salidas: true },
    });

    if (!entrada) {
      throw new NotFoundException(`Entrada con ID ${entradaId} no encontrada.`);
    }

    const pathName = this.mediaMTXService.calcularPathEntrada(entrada);
    const estadoPath = await this.mediaMTXService.getEstadoPath(pathName);

    // La API de MediaMTX no expone el estado de los 'runOnReady'.
    // Devolvemos el estado del stream y la configuración de outputs que debería estar activa.
    return {
      entradaActiva: estadoPath?.ready || false,
      bytesEnviados: estadoPath?.bytesSent || 0,
      configuracionOutputs: this.convertirSalidasAOutputs(entrada.salidas),
      pathName: pathName,
      estadoPath: estadoPath || 'no_existe',
    };
  }

  async forzarSincronizacionEntrada(entradaId: string): Promise<any> {
    const entrada = await this.prisma.entradaStream.findUnique({
      where: { id: entradaId },
      include: { salidas: true },
    });

    if (!entrada) {
      throw new NotFoundException(`Entrada con ID ${entradaId} no encontrada.`);
    }

    this.logger.log(`Forzando sincronización con hot-reload verdadero para entrada ${entrada.nombre} (${entradaId})`);
    
    // Usar hot-reload verdadero que no mata conexiones
    await this.sincronizarOutputsConHotReload(entradaId);
    
    return {
      mensaje: `Sincronización con hot-reload verdadero completada para entrada '${entrada.nombre}'`,
      entradaId: entradaId,
      outputsConfiguratos: entrada.salidas.length,
      timestamp: new Date().toISOString(),
    };
  }
  
  // ... (verificarMediaMTX, obtenerPathsMediaMTX, obtenerEstadisticasMediaMTX pueden ser simplificados o eliminados si no se usan en el controller)

  private generarClaveUnica(): string {
    return randomBytes(16).toString('hex');
  }
}
