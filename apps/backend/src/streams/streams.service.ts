import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearEntradaDto } from './dto/crear-entrada.dto';
import { ActualizarEntradaDto } from './dto/actualizar-entrada.dto';
import { CrearSalidaDto } from './dto/crear-salida.dto';
import { ActualizarSalidaDto } from './dto/actualizar-salida.dto';
import { ProtocoloStream, ProtocoloSalida } from '../prisma/generated/client';
import { randomBytes } from 'crypto';

@Injectable()
export class StreamsService {
  constructor(private prisma: PrismaService) {}

  // ===== MÉTODOS PARA ENTRADAS =====
  async crearEntrada(crearEntradaDto: CrearEntradaDto) {
    let claveStream: string | undefined;
    if (crearEntradaDto.protocolo === ProtocoloStream.RTMP) {
      claveStream = this.generarClaveUnica();
    }

    // Validar que el puerto SRT sea requerido para protocolo SRT
    if (crearEntradaDto.protocolo === ProtocoloStream.SRT && !crearEntradaDto.puertoSRT) {
      throw new BadRequestException('El puerto SRT es requerido para entradas SRT');
    }

    // Aquí iría la lógica para verificar que el puerto SRT no esté en uso
    // Por ahora, lo dejamos pendiente.

    return this.prisma.entradaStream.create({
      data: {
        ...crearEntradaDto,
        claveStream,
      },
    });
  }

  async obtenerEntradas() {
    return this.prisma.entradaStream.findMany({
      include: {
        salidas: true, // Incluimos las salidas relacionadas
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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
    await this.obtenerEntradaPorId(id);

    // Si se cambia el protocolo a RTMP y no tiene clave, generar una nueva
    let claveStream = actualizarEntradaDto.claveStream;
    if (actualizarEntradaDto.protocolo === ProtocoloStream.RTMP && !claveStream) {
      claveStream = this.generarClaveUnica();
    }

    return this.prisma.entradaStream.update({
      where: { id },
      data: {
        ...actualizarEntradaDto,
        claveStream,
      },
      include: {
        salidas: true,
      },
    });
  }

  async eliminarEntrada(id: string) {
    // Verificar que la entrada existe
    await this.obtenerEntradaPorId(id);

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

  private generarClaveUnica(): string {
    return randomBytes(16).toString('hex');
  }
}
