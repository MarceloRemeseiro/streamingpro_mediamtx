import { Injectable, NotFoundException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { EntradaStream } from './entities/entrada.entity';
import { SalidaStream } from '../salida/entities/salida.entity';
import { CreateEntradaDto } from './dto/create-entrada.dto';
import { UpdateEntradaDto } from './dto/update-entrada.dto';
import { ProtocoloStream, ProtocoloSalida } from '../entities/enums';
import { getStreamingUrlGenerator } from '../config/streaming.config';
import { StreamIntegrationService } from '../media-mtx/services/integration/stream-integration.service';

@Injectable()
export class EntradaService {
  private readonly logger = new Logger(EntradaService.name);
  private urlGenerator = getStreamingUrlGenerator();

  constructor(
    @InjectRepository(EntradaStream)
    private readonly entradaRepository: Repository<EntradaStream>,
    @InjectRepository(SalidaStream)
    private readonly salidaRepository: Repository<SalidaStream>,
    private readonly streamIntegration: StreamIntegrationService,
  ) {}

  // ===== CRUD PRINCIPAL =====

  async crearEntrada(crearEntradaDto: CreateEntradaDto): Promise<EntradaStream> {
    // 1. Verificar si ya existe una entrada con el mismo nombre
    const nombreExistente = await this.entradaRepository.findOne({
      where: { nombre: crearEntradaDto.nombre },
    });
    if (nombreExistente) {
      throw new BadRequestException(`Ya existe una entrada con el nombre "${crearEntradaDto.nombre}".`);
    }

    // Obtener la posición más alta actual para asignar la siguiente
    const maxPositionResult = await this.entradaRepository
      .createQueryBuilder("entrada")
      .select("MAX(entrada.position)", "maxPos")
      .getRawOne();
    const nextPosition = (maxPositionResult?.maxPos ?? -1) + 1;

    let datosEntrada: Partial<EntradaStream> = {
      nombre: crearEntradaDto.nombre,
      protocolo: crearEntradaDto.protocolo,
      position: nextPosition,
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
      datosEntrada = {
        ...datosEntrada,
        puertoSRT: crearEntradaDto.puertoSRT || 8890,
        latenciaSRT: crearEntradaDto.latenciaSRT || 200,
        passphraseSRT: crearEntradaDto.passphraseSRT,
        streamId: `publish:${streamPath}`,
        url: this.urlGenerator.generateSrtUrl(`publish:${streamPath}`, crearEntradaDto.passphraseSRT),
      };
    } else {
      throw new BadRequestException(`Protocolo no soportado: ${crearEntradaDto.protocolo}`);
    }

    // Crear la entrada
    const nuevaEntrada = this.entradaRepository.create(datosEntrada);
    const entradaGuardada = await this.entradaRepository.save(nuevaEntrada);
    
    this.logger.log(`✅ Entrada '${entradaGuardada.nombre}' creada exitosamente (${entradaGuardada.protocolo})`);

    // Crear outputs por defecto
    await this.crearOutputsPorDefecto(entradaGuardada.id);

    // Obtener la entrada completa con salidas
    const entradaCompleta = await this.obtenerEntradaPorId(entradaGuardada.id);
    
    // ✅ Sincronizar con MediaMTX
    try {
      await this.streamIntegration.setupInput(
        entradaCompleta,
      );
      this.logger.log(
        `🔗 Entrada '${entradaCompleta.nombre}' sincronizada con MediaMTX`,
      );
    } catch (error) {
      this.logger.error(`⚠️ Error sincronizando con MediaMTX: ${error.message}`);
      // No fallar la creación si MediaMTX no está disponible
    }

    return entradaCompleta;
  }

  async obtenerEntradas(): Promise<EntradaStream[]> {
    const entradas = await this.entradaRepository.find({
      relations: ['salidas'],
      order: { 
        position: 'ASC',
        salidas: {
          position: 'ASC'
        }
      },
    });

    this.logger.log(`📋 Obtenidas ${entradas.length} entradas`);
    
    // Mapear datos de entrada a salidas anidadas
    return entradas.map(entrada => this.mapEntradaDataToSalidas(entrada));
  }

  async obtenerEntradaPorId(id: string): Promise<EntradaStream> {
    const entrada = await this.entradaRepository.findOne({
      where: { id },
      relations: ['salidas'],
      order: {
        salidas: {
          position: 'ASC'
        }
      }
    });

    if (!entrada) {
      throw new NotFoundException(`Entrada con ID ${id} no encontrada`);
    }

    // Mapear datos de entrada a salidas anidadas
    return this.mapEntradaDataToSalidas(entrada);
  }

  async actualizarEntrada(id: string, actualizarEntradaDto: UpdateEntradaDto): Promise<EntradaStream> {
    const entrada = await this.obtenerEntradaPorId(id);
    
    // Verificar si se está cambiando el nombre a uno que ya existe
    if (actualizarEntradaDto.nombre && actualizarEntradaDto.nombre !== entrada.nombre) {
      const nombreExistente = await this.entradaRepository.findOne({
        where: { nombre: actualizarEntradaDto.nombre },
      });
      if (nombreExistente) {
        throw new BadRequestException(`Ya existe una entrada con el nombre "${actualizarEntradaDto.nombre}".`);
      }
    }

    // Aplicar actualizaciones
    Object.assign(entrada, actualizarEntradaDto);
    
    const entradaActualizada = await this.entradaRepository.save(entrada);
    
    this.logger.log(`✅ Entrada '${entradaActualizada.nombre}' actualizada exitosamente`);
    
    // ✅ Sincronizar cambios con MediaMTX
    try {
      await this.streamIntegration.updateInput(
        entradaActualizada,
      );
      this.logger.log(
        `🔗 Entrada '${entradaActualizada.nombre}' actualizada en MediaMTX`,
      );
    } catch (error) {
      this.logger.error(`⚠️ Error actualizando en MediaMTX: ${error.message}`);
    }

    return entradaActualizada;
  }

  async eliminarEntrada(id: string): Promise<void> {
    const entrada = await this.obtenerEntradaPorId(id);
    
    // ✅ Eliminar configuración de MediaMTX
    try {
      await this.streamIntegration.removeInput(entrada);
      this.logger.log(`🔗 Entrada '${entrada.nombre}' eliminada de MediaMTX`);
    } catch (error) {
      this.logger.error(`⚠️ Error eliminando de MediaMTX: ${error.message}`);
    }

    await this.entradaRepository.remove(entrada);
    
    this.logger.log(`🗑️ Entrada '${entrada.nombre}' eliminada exitosamente`);
  }

  async validarNombreDisponible(nombre: string): Promise<{ disponible: boolean }> {
    const entrada = await this.entradaRepository.findOne({ where: { nombre } });
    return { disponible: !entrada };
  }

  async reordenarEntradas(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      return;
    }

    this.logger.log(`🔄 Reordenando ${ids.length} entradas...`);

    const queryRunner = this.entradaRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        await queryRunner.manager.update(EntradaStream, id, { position: i });
      }

      await queryRunner.commitTransaction();
      this.logger.log('✅ Entradas reordenadas exitosamente.');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('❌ Error al reordenar entradas, transacción revertida.', error.stack);
      throw new InternalServerErrorException('Error al reordenar las entradas.');
    } finally {
      await queryRunner.release();
    }
  }

  // ===== OUTPUTS POR DEFECTO =====

  /**
   * Crea los 3 outputs por defecto para una entrada: HLS, SRT Pull y RTMP Pull
   * Todos configurados para funcionar en VLC con baja latencia
   */
  private async crearOutputsPorDefecto(entradaId: string): Promise<void> {
    try {
      const entrada = await this.entradaRepository.findOne({ where: { id: entradaId } });

      if (!entrada) {
        this.logger.error(`No se puede crear outputs por defecto: Entrada ${entradaId} no encontrada`);
        return;
      }

      // Calcular el path correcto según el protocolo de entrada
      // RTMP: live/{streamKey}, SRT: {streamId}
      const pathName = this.calcularPathParaLectura(entrada);

      // 1. HLS - URL para consumo directo
      await this.salidaRepository.save({
        nombre: 'HLS',
        protocolo: ProtocoloSalida.HLS,
        entradaId,
        habilitada: true,
        urlDestino: `http://localhost:8888/${pathName}/index.m3u8`,
      });

      // 2. SRT Caller - URL para consumo directo desde VLC
      await this.salidaRepository.save({
        nombre: 'SRT Pull',
        protocolo: ProtocoloSalida.SRT,
        entradaId,
        habilitada: true,
        urlDestino: `srt://localhost:8890?streamid=read:${pathName}`,
        puertoSRT: 8890,
        latenciaSRT: 40,
      });

      // 3. RTMP - URL para consumo directo desde VLC
      await this.salidaRepository.save({
        nombre: 'RTMP Pull',
        protocolo: ProtocoloSalida.RTMP,
        entradaId,
        habilitada: true,
        urlDestino: `rtmp://localhost:1935/${pathName}`,
      });

      this.logger.log(`📦 Outputs por defecto creados para entrada '${entrada.nombre}': HLS, SRT Pull, RTMP Pull`);

    } catch (error) {
      this.logger.error(`❌ Error al crear outputs por defecto para entrada ${entradaId}:`, error.message);
    }
  }

  // ===== UTILIDADES =====

  private generarClaveUnica(): string {
    return randomBytes(12).toString('hex');
  }

  private calcularPathParaSalida(entrada: EntradaStream): string {
    if (entrada.protocolo === ProtocoloStream.RTMP && entrada.streamKey) {
      // Para RTMP, el path es el streamKey, que es la parte variable de la URL
      return entrada.streamKey;
    }

    if (entrada.protocolo === ProtocoloStream.SRT && entrada.streamId) {
      // Para SRT, el path es el identificador único sin el prefijo 'publish:'
      return entrada.streamId.replace('publish:', '');
    }

    // Fallback genérico, aunque no debería llegar aquí si la entrada está bien formada
    this.logger.warn(`No se pudo determinar un path de salida claro para la entrada ${entrada.id}. Usando nombre por defecto.`);
    return entrada.nombre.toLowerCase().replace(/\\s+/g, '_');
  }

  /**
   * Calcula el path correcto para LEER desde MediaMTX (outputs por defecto)
   * Coincide con generateInputPathName del PathManagerService
   */
  private calcularPathParaLectura(entrada: EntradaStream): string {
    if (entrada.protocolo === ProtocoloStream.RTMP && entrada.streamKey) {
      // RTMP usa live/{streamKey} para recibir, entonces leemos desde live/{streamKey}
      return `live/${entrada.streamKey}`;
    }

    if (entrada.protocolo === ProtocoloStream.SRT && entrada.streamId) {
      // SRT usa {streamId} directo para recibir, entonces leemos desde {streamId}
      return entrada.streamId.replace('publish:', '');
    }

    // Fallback genérico
    this.logger.warn(`No se pudo determinar un path de lectura claro para la entrada ${entrada.id}. Usando nombre por defecto.`);
    return entrada.nombre.toLowerCase().replace(/\\s+/g, '_');
  }

  /**
   * Mapea datos de la entrada padre a todas sus salidas para enriquecer el DTO de respuesta.
   */
  private mapEntradaDataToSalidas(entrada: EntradaStream): EntradaStream {
    if (entrada.salidas && entrada.salidas.length > 0) {
      entrada.salidas.forEach(salida => {
        // Para todas las salidas, copiar el streamId de la entrada
        salida.streamId = entrada.streamId;
        
        // Para el streamKey, depende del protocolo de la entrada
        if (entrada.streamKey) {
          // Si la entrada tiene streamKey (RTMP), usarlo directamente
          salida.streamKey = entrada.streamKey;
        } else if (entrada.streamId) {
          // Si la entrada es SRT (tiene streamId pero no streamKey), 
          // extraer el hash para usarlo como streamKey en salidas RTMP
          salida.streamKey = entrada.streamId.replace('publish:', '');
        }
      });
    }
    return entrada;
  }

  // ===== MÉTODOS LEGACY COMPATIBLES =====

  create(createEntradaDto: CreateEntradaDto) {
    return this.crearEntrada(createEntradaDto);
  }

  findAll() {
    return this.obtenerEntradas();
  }

  findOne(id: string) {
    return this.obtenerEntradaPorId(id);
  }

  update(id: string, updateEntradaDto: UpdateEntradaDto) {
    return this.actualizarEntrada(id, updateEntradaDto);
  }

  remove(id: string) {
    return this.eliminarEntrada(id);
  }
}
