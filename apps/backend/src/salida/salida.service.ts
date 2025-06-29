import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalidaStream } from './entities/salida.entity';
import { EntradaStream } from '../entrada/entities/entrada.entity';
import { CreateSalidaDto } from './dto/create-salida.dto';
import { UpdateSalidaDto } from './dto/update-salida.dto';
import { ReordenarSalidasDto } from './dto/reordenar-salidas.dto';
import { PathManagerService } from '../media-mtx/services/core/path-manager.service';
// import { OutputStatusService } from './services/output-status.service'; // LEGACY - removido
import { EstadoSalidasService } from '../estado/services/estado-salidas.service';
import { ProtocoloSalida, EstadoOutput } from '../entities/enums';

@Injectable()
export class SalidaService {
  private readonly logger = new Logger(SalidaService.name);

  constructor(
    @InjectRepository(SalidaStream)
    private readonly salidaRepository: Repository<SalidaStream>,
    @InjectRepository(EntradaStream)
    private readonly entradaRepository: Repository<EntradaStream>,
    private readonly pathManager: PathManagerService,
    // private readonly outputStatusService: OutputStatusService, // LEGACY - removido
    private readonly estadoSalidasService: EstadoSalidasService,
  ) {}

  // ===== CRUD PRINCIPAL =====

  async crearSalida(crearSalidaDto: CreateSalidaDto): Promise<SalidaStream> {
    const entrada = await this.entradaRepository.findOne({
      where: { id: crearSalidaDto.entradaId },
    });
    
    if (!entrada) {
      throw new NotFoundException(
        `Entrada con ID ${crearSalidaDto.entradaId} no encontrada.`,
      );
    }

    // Calcular la nueva posición
    const [_, count] = await this.salidaRepository.findAndCount({
      where: { entradaId: crearSalidaDto.entradaId },
    });
    const nuevaPosicion = count;

    const nuevaSalida = this.salidaRepository.create({
      ...crearSalidaDto,
      entrada: entrada, // Aseguramos que la relación está cargada
      habilitada: crearSalidaDto.habilitada ?? false,
      position: nuevaPosicion,
    });

    const salidaGuardada = await this.salidaRepository.save(nuevaSalida);
    
    this.logger.log(
      `✅ Salida '${salidaGuardada.nombre}' creada para la entrada '${entrada.nombre}'`,
    );
    
    // Notificar al frontend via WebSocket - establecer estado inicial
    if (salidaGuardada.habilitada) {
      await this.estadoSalidasService.establecerEstadoOutput(
        salidaGuardada.id,
        EstadoOutput.CONECTANDO,
      );
    }
    
    // Hot-reload: si la entrada está activa y la nueva salida está habilitada
    if (entrada.activa && salidaGuardada.habilitada) {
      this.logger.debug(`🔥 Hot-reload: Activando nueva salida en MediaMTX...`);
      try {
        const pid = await this.pathManager.activateOutput(salidaGuardada);
        salidaGuardada.procesoFantasmaPid = pid;
        await this.salidaRepository.save(salidaGuardada);
        this.logger.log(
          `🚀 Salida '${salidaGuardada.nombre}' activada en MediaMTX`,
        );
      } catch (error) {
        this.logger.error(
          `⚠️ Error en hot-reload (activar): ${error.message}`,
        );
      }
    }
    
    return salidaGuardada;
  }

  async obtenerSalidas(): Promise<SalidaStream[]> {
    const salidas = await this.salidaRepository.find({
      relations: ['entrada'],
      order: { position: 'ASC', createdAt: 'ASC' },
    });

    this.logger.log(`📋 Obtenidas ${salidas.length} salidas`);
    return salidas.map((s) => this.mapEntradaDataToSalida(s));
  }

  async obtenerSalidasPorEntrada(entradaId: string): Promise<SalidaStream[]> {
    // Verificar que la entrada existe
    const entrada = await this.entradaRepository.findOne({ where: { id: entradaId } });
    
    if (!entrada) {
      throw new NotFoundException(`Entrada con ID ${entradaId} no encontrada`);
    }

    const salidas = await this.salidaRepository.find({
      where: { entradaId },
      relations: ['entrada'],
      order: { position: 'ASC', createdAt: 'ASC' },
    });

    this.logger.log(`📋 Obtenidas ${salidas.length} salidas para entrada '${entrada.nombre}'`);
    return salidas.map((s) => this.mapEntradaDataToSalida(s));
  }

  async obtenerSalidaPorId(id: string): Promise<SalidaStream> {
    const salida = await this.salidaRepository.findOne({
      where: { id },
      relations: ['entrada'],
    });

    if (!salida) {
      throw new NotFoundException(`Salida con ID ${id} no encontrada`);
    }

    return this.mapEntradaDataToSalida(salida);
  }

  async actualizarSalida(
    id: string,
    actualizarSalidaDto: UpdateSalidaDto,
  ): Promise<SalidaStream> {
    const salidaExistente = await this.salidaRepository.findOne({
      where: { id },
      relations: ['entrada'],
    });
    
    if (!salidaExistente) {
      throw new NotFoundException(`Salida con ID ${id} no encontrada.`);
    }

    const estabaHabilitada = salidaExistente.habilitada;

    // Aplicar actualizaciones
    Object.assign(salidaExistente, actualizarSalidaDto);
    
    const salidaActualizada = await this.salidaRepository.save(salidaExistente);

    this.logger.log(
      `✅ Salida '${salidaActualizada.nombre}' actualizada exitosamente`,
    );

    // **NUEVO: Manejo de estados para outputs personalizados**
    if (salidaActualizada.habilitada !== estabaHabilitada) {
      this.logger.debug(`🔄 Gestionando cambio de estado para output: ${salidaActualizada.nombre}`);
      
      // Solo manejar estados para outputs personalizados
      if (this.esOutputPersonalizado(salidaActualizada)) {
        try {
          if (salidaActualizada.habilitada) {
            // Cuando se habilita, cambiar inmediatamente a estado "conectando"
            salidaActualizada.estado = EstadoOutput.CONECTANDO;
            await this.salidaRepository.save(salidaActualizada);
            this.logger.log(`🟠 Output "${salidaActualizada.nombre}" cambiado a estado CONECTANDO`);
            
            // Emitir evento WebSocket inmediatamente
            await this.estadoSalidasService.establecerEstadoOutput(
              salidaActualizada.id,
              EstadoOutput.CONECTANDO,
            );
            
          } else {
            // Cuando se deshabilita, cambiar inmediatamente a estado "apagado"
            salidaActualizada.estado = EstadoOutput.APAGADO;
            await this.salidaRepository.save(salidaActualizada);
            this.logger.log(`⚫ Output "${salidaActualizada.nombre}" cambiado a estado APAGADO`);
            
            // Emitir evento WebSocket inmediatamente
            await this.estadoSalidasService.establecerEstadoOutput(
              salidaActualizada.id,
              EstadoOutput.APAGADO,
            );
          }
        } catch (error) {
          this.logger.error(`Error al gestionar estado de output ${salidaActualizada.id}:`, error);
        }
      }
    }

    // **NUEVO: Verificación inmediata si se editó un output habilitado**
    if (this.esOutputPersonalizado(salidaActualizada) && salidaActualizada.habilitada) {
      this.logger.debug(`🔍 Verificando inmediatamente output editado: ${salidaActualizada.nombre}`);
      try {
        // Usar setTimeout para no bloquear la respuesta HTTP
        // El EstadoSalidasService ya se encarga del monitoreo automático cada 5 segundos
        // No necesitamos verificación manual adicional
        // setTimeout(async () => {
        //   try {
        //     await this.outputStatusService.verificarYActualizarEstado(salidaActualizada);
        //   } catch (error) {
        //     this.logger.error(`Error en verificación diferida de output ${salidaActualizada.id}:`, error);
        //   }
        // }, 2000);
      } catch (error) {
        this.logger.error(`Error programando verificación de output ${salidaActualizada.id}:`, error);
      }
    }

    // Hot-reload: si la entrada está activa, actualizamos el estado en MediaMTX
    if (salidaActualizada.entrada.activa) {
      this.logger.debug(`🔥 Hot-reload: Actualizando salida en MediaMTX...`);
      try {
        // Si el estado de habilitación cambió
        if (salidaActualizada.habilitada !== estabaHabilitada) {
          if (salidaActualizada.habilitada) {
            this.logger.log(
              `[Hot-Reload] Activando salida '${salidaActualizada.nombre}' (${salidaActualizada.protocolo})...`,
            );
            if (salidaActualizada.protocolo === ProtocoloSalida.SRT) {
              this.logger.debug(`🔍 [SRT] Datos de salida:`, {
                url: salidaActualizada.urlDestino,
                puerto: salidaActualizada.puertoSRT,
                streamId: salidaActualizada.streamIdSRT,
                passphrase: salidaActualizada.passphraseSRT ? '***' : null,
                latencia: salidaActualizada.latenciaSRT
              });
            }
            const pid = await this.pathManager.activateOutput(salidaActualizada);
            salidaActualizada.procesoFantasmaPid = pid;
          } else {
            await this.pathManager.deactivateOutput(
              salidaActualizada,
              salidaExistente.procesoFantasmaPid,
            );
            salidaActualizada.procesoFantasmaPid = null;
          }
        } else if (salidaActualizada.habilitada) {
          // Si no cambió pero estaba habilitada, puede que la URL haya cambiado.
          // La forma más simple es reactivarla.
          this.logger.log(
            `🔄 Salida '${salidaActualizada.nombre}' reactivada en MediaMTX para aplicar cambios de URL.`,
          );
          await this.pathManager.deactivateOutput(
            salidaExistente,
            salidaExistente.procesoFantasmaPid,
          );
          const nuevoPid = await this.pathManager.activateOutput(salidaActualizada);
          salidaActualizada.procesoFantasmaPid = nuevoPid;
        }
      } catch (error) {
        this.logger.error(
          `⚠️ Error en hot-reload (actualizar): ${error.message}`,
        );
      }
    }
    
    // Guardar todos los cambios acumulados en la entidad
    const salidaFinal = await this.salidaRepository.save(salidaActualizada);
    
    // Forzar verificación de estado si el output está habilitado, para feedback instantáneo
    if (salidaFinal.habilitada) {
      this.logger.debug(`⚡ Forzando verificación de estado para '${salidaFinal.nombre}' tras actualización.`);
      // Usamos un 'await' para asegurar que la verificación se completa antes de devolver la respuesta.
      // Lo envolvemos en un try/catch para que un fallo aquí no rompa toda la actualización.
      // TODO: Implementar verificación de estado cuando arreglemos la arquitectura
      // try {
      //   await this.outputStatusService.verificarYActualizarEstado(salidaFinal);
      // } catch (error) {
      //   this.logger.error(`Error en la verificación forzada de estado para ${salidaFinal.id}:`, error);
      // }
    }
    
    // Notificar al frontend - el estado ya se gestionó arriba, solo forzamos emisión
    // El EstadoSalidasService se encarga del monitoreo automático
    
    // Recargamos la entidad una última vez para asegurar que devolvemos el estado más fresco posible
    // después de la verificación forzada.
    return this.salidaRepository.findOne({ 
      where: { id: salidaFinal.id }, 
      relations: ['entrada'] 
    });
  }

  async eliminarSalida(id: string): Promise<void> {
    const salidaExistente = await this.salidaRepository.findOne({ 
      where: { id },
      relations: ['entrada'],
    });
    
    if (!salidaExistente) {
      throw new NotFoundException(`Salida con ID ${id} no encontrada.`);
    }

    const entradaId = salidaExistente.entradaId;
    const nombreSalida = salidaExistente.nombre;
    
    // Hot-reload: si la entrada está activa, desactivar la salida en MediaMTX antes de eliminar
    if (salidaExistente.entrada.activa) {
      this.logger.debug(`🔥 Hot-reload: Desactivando salida en MediaMTX...`);
      try {
        await this.pathManager.deactivateOutput(
          salidaExistente,
          salidaExistente.procesoFantasmaPid,
        );
        this.logger.log(`⏹️ Salida '${nombreSalida}' desactivada en MediaMTX`);
      } catch (error) {
        this.logger.error(
          `⚠️ Error en hot-reload (desactivar): ${error.message}`,
        );
      }
    }

    // Notificar al frontend ANTES de eliminar - establecer estado APAGADO antes de eliminar
    await this.estadoSalidasService.establecerEstadoOutput(
      salidaExistente.id,
      EstadoOutput.APAGADO,
    );

    // Eliminar de la base de datos
    await this.salidaRepository.remove(salidaExistente);
    
    this.logger.log(`🗑️ Salida '${nombreSalida}' eliminada exitosamente`);
  }

  // ===== MÉTODOS ESPECÍFICOS =====

  /**
   * Obtiene outputs por streamKey (para compatibilidad con scripts)
   */
  async obtenerOutputsPorStreamKey(streamKey: string): Promise<any[]> {
    // Buscar la entrada por streamKey
    const entrada = await this.entradaRepository.findOne({
      where: { streamKey },
      relations: ['salidas'],
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

  // ===== MOCKS TEMPORALES PARA MEDIAMTX =====

  private async sincronizarOutputsConHotReload(entradaId: string): Promise<void> {
    this.logger.log(`🔄 [MOCK] Sincronizando outputs con hot-reload para entrada ${entradaId}...`);
    // TODO: Implementar cuando tengamos MediaMTXService
  }

  // ===== MÉTODOS LEGACY COMPATIBLES =====

  create(createSalidaDto: CreateSalidaDto) {
    return this.crearSalida(createSalidaDto);
  }

  findAll() {
    return this.obtenerSalidas();
  }

  findOne(id: string) {
    return this.obtenerSalidaPorId(id);
  }

  update(id: string, updateSalidaDto: UpdateSalidaDto) {
    return this.actualizarSalida(id, updateSalidaDto);
  }

  remove(id: string) {
    return this.eliminarSalida(id);
  }

  async reordenarSalidas(
    reordenarSalidasDto: ReordenarSalidasDto,
  ): Promise<void> {
    const { salidaIds } = reordenarSalidasDto;
    this.logger.log(`🔄 Reordenando ${salidaIds.length} salidas...`);

    // Usar un bucle para actualizar la posición de cada salida
    // En un entorno de alta concurrencia, esto debería ser una transacción
    await Promise.all(
      salidaIds.map((id, index) =>
        this.salidaRepository.update(id, { position: index }),
      ),
    );

    this.logger.log(`✅ Salidas reordenadas exitosamente.`);

    // Opcional: Notificar al frontend que el orden ha sido persistido
    // Esto es útil si quieres mostrar un indicador de "Guardado".
    // Por ahora, la actualización optimista del frontend es suficiente.
  }

  /**
   * Mapea datos de la entrada padre a la salida para enriquecer el DTO de respuesta.
   */
  private mapEntradaDataToSalida(salida: SalidaStream): SalidaStream {
    if (salida.entrada) {
      salida.streamKey = salida.entrada.streamKey;
      salida.streamId = salida.entrada.streamId;
    }
    return salida;
  }

  /**
   * Verifica si un output es personalizado (no por defecto)
   * Los outputs por defecto son: SRT Pull, RTMP Pull, HLS
   */
  private esOutputPersonalizado(salida: SalidaStream): boolean {
    const OUTPUTS_POR_DEFECTO = ['SRT Pull', 'RTMP Pull', 'HLS'];
    return !OUTPUTS_POR_DEFECTO.includes(salida.nombre);
  }
}
