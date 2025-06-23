import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaMTXService } from '../mediamtx/mediamtx.service';
import { CrearEntradaDto } from './dto/crear-entrada.dto';
import { ActualizarEntradaDto } from './dto/actualizar-entrada.dto';
import { CrearSalidaDto } from './dto/crear-salida.dto';
import { ActualizarSalidaDto } from './dto/actualizar-salida.dto';
import { ProtocoloStream, ProtocoloSalida } from '../prisma/generated/client';
import { randomBytes } from 'crypto';
import { getStreamingUrlGenerator } from '../config/streaming.config';

@Injectable()
export class StreamsService {
  private urlGenerator = getStreamingUrlGenerator();

  constructor(
    private prisma: PrismaService,
    private mediaMTXService: MediaMTXService,
  ) {}

  // ===== MÉTODOS PARA ENTRADAS =====
  async crearEntrada(crearEntradaDto: CrearEntradaDto) {
    let datosEntrada: any = {
      nombre: crearEntradaDto.nombre,
      protocolo: crearEntradaDto.protocolo,
    };

    if (crearEntradaDto.protocolo === ProtocoloStream.RTMP) {
      // RTMP: Generar streamKey y URL usando configuración
      const streamKey = this.generarClaveUnica();
      datosEntrada = {
        ...datosEntrada,
        streamKey,
        url: this.urlGenerator.generateRtmpUrl(streamKey),
      };
    } else if (crearEntradaDto.protocolo === ProtocoloStream.SRT) {
      // SRT: Generar path único, passphrase opcional usando configuración
      const streamPath = this.generarClaveUnica();
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

    // Crear la entrada en la base de datos
    const entrada = await this.prisma.entradaStream.create({
      data: datosEntrada,
    });

    // Sincronizar con MediaMTX
    try {
      await this.mediaMTXService.sincronizarEntrada(entrada);
    } catch (error) {
      // Log el error pero no fallar la creación
      console.warn('Error al sincronizar entrada con MediaMTX:', error.message);
    }

    return entrada;
  }

  async obtenerEntradas() {
    const entradas = await this.prisma.entradaStream.findMany({
      include: {
        salidas: true, // Incluimos las salidas relacionadas
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Enriquecer con información de MediaMTX
    const entradasConEstado = await Promise.all(
      entradas.map(async (entrada) => {
        let pathName = '';
        let hlsUrl = '';
        let activo = false;
        let estadisticas = null;

        try {
          if (entrada.protocolo === ProtocoloStream.RTMP && entrada.streamKey) {
            pathName = `live/${entrada.streamKey}`;
            hlsUrl = this.urlGenerator.generateHlsUrl(pathName);
            console.log(`Generated HLS URL for RTMP entrada ${entrada.id}:`, hlsUrl);
            estadisticas = await this.mediaMTXService.obtenerEstadisticasStream(pathName);
          } else if (entrada.protocolo === ProtocoloStream.SRT && entrada.streamId) {
            pathName = entrada.streamId.replace('publish:', '');
            hlsUrl = this.urlGenerator.generateHlsUrl(pathName);
            console.log(`Generated HLS URL for SRT entrada ${entrada.id}:`, hlsUrl);
            estadisticas = await this.mediaMTXService.obtenerEstadisticasStream(pathName);
          }

          activo = estadisticas ? estadisticas.activo : false;
        } catch (error) {
          // Si no se puede obtener información de MediaMTX, continuar sin estado
          console.warn(`No se pudo obtener estado de MediaMTX para entrada ${entrada.id}:`, error.message);
        }

        return {
          ...entrada,
          activo,
          hlsUrl,
          pathName,
          estadisticas,
        };
      })
    );

    return entradasConEstado;
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

  async eliminarEntrada(id: string) {
    // Verificar que la entrada existe
    const entrada = await this.obtenerEntradaPorId(id);

    // Eliminar de MediaMTX primero
    try {
      await this.mediaMTXService.eliminarEntrada(entrada);
    } catch (error) {
      console.warn('Error al eliminar entrada de MediaMTX:', error.message);
    }

    return this.prisma.entradaStream.delete({
      where: { id },
    });
  }

  // ===== MÉTODOS PARA SALIDAS =====
  async crearSalida(crearSalidaDto: CrearSalidaDto) {
    // Verificar que la entrada existe
    await this.obtenerEntradaPorId(crearSalidaDto.entradaId);

    // Validaciones específicas por protocolo
    if (crearSalidaDto.protocolo === ProtocoloSalida.RTMP) {
      if (!crearSalidaDto.urlDestino) {
        throw new BadRequestException('URL destino es requerida para salidas RTMP');
      }
      if (!crearSalidaDto.claveStreamRTMP) {
        // Generar clave automáticamente si no se proporciona
        crearSalidaDto.claveStreamRTMP = this.generarClaveUnica();
      }
    }

    if (crearSalidaDto.protocolo === ProtocoloSalida.SRT) {
      if (!crearSalidaDto.urlDestino) {
        throw new BadRequestException('URL destino es requerida para salidas SRT');
      }
    }

    return this.prisma.salidaStream.create({
      data: crearSalidaDto,
      include: {
        entrada: true,
      },
    });
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

  async actualizarSalida(id: string, actualizarSalidaDto: ActualizarSalidaDto) {
    // Verificar que la salida existe
    await this.obtenerSalidaPorId(id);

    return this.prisma.salidaStream.update({
      where: { id },
      data: actualizarSalidaDto,
      include: {
        entrada: true,
      },
    });
  }

  async eliminarSalida(id: string) {
    // Verificar que la salida existe
    await this.obtenerSalidaPorId(id);

    return this.prisma.salidaStream.delete({
      where: { id },
    });
  }

  // ===== MÉTODOS MEDIAMTX =====
  async verificarMediaMTX() {
    try {
      const activo = await this.mediaMTXService.verificarEstado();
      return {
        activo,
        mensaje: activo ? 'MediaMTX funcionando correctamente' : 'MediaMTX no responde',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        activo: false,
        mensaje: 'Error al verificar MediaMTX',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async obtenerPathsMediaMTX() {
    try {
      const pathsList = await this.mediaMTXService.obtenerPaths();
      return {
        paths: pathsList.items,
        total: pathsList.itemCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        paths: [],
        total: 0,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async obtenerEstadisticasMediaMTX() {
    try {
      return await this.mediaMTXService.obtenerEstadisticasGenerales();
    } catch (error) {
      return {
        totalStreams: 0,
        streamsActivos: 0,
        totalBytesRecibidos: 0,
        totalBytesEnviados: 0,
        streams: [],
        error: error.message,
      };
    }
  }

  private generarClaveUnica(): string {
    return randomBytes(16).toString('hex');
  }
}
