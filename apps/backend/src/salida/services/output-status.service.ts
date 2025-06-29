import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { SalidaStream } from '../entities/salida.entity';
import { EstadoOutput } from '../../entities/enums';
import { spawn } from 'child_process';

@Injectable()
export class OutputStatusService {
  private readonly logger = new Logger(OutputStatusService.name);

  constructor(
    @InjectRepository(SalidaStream)
    private readonly salidaRepository: Repository<SalidaStream>,
  ) {
    // Recuperar outputs huérfanos al inicializar el servicio
    setTimeout(() => this.recuperarOutputsHuerfanos(), 2000);
  }

  /**
   * Recupera outputs que tienen PID pero estado incorrecto tras reinicio del backend
   */
  private async recuperarOutputsHuerfanos(): Promise<void> {
    try {
      this.logger.log('🔄 Iniciando recuperación de outputs huérfanos...');
      
      // Buscar outputs con PID pero estado "apagado" o "error"
      const outputsHuerfanos = await this.salidaRepository.find({
        where: [
          { procesoFantasmaPid: Not(IsNull()), estado: EstadoOutput.APAGADO },
          { procesoFantasmaPid: Not(IsNull()), estado: EstadoOutput.ERROR },
        ],
        relations: ['entrada'],
      });

      if (outputsHuerfanos.length === 0) {
        this.logger.log('✅ No hay outputs huérfanos para recuperar');
        return;
      }

      for (const output of outputsHuerfanos) {
        const pid = output.procesoFantasmaPid;
        if (await this.isProcessRunning(pid)) {
          // El proceso existe, actualizar estado a conectado
          await this.salidaRepository.update(output.id, { estado: EstadoOutput.CONECTADO });
          this.logger.log(`✅ Output huérfano recuperado: "${output.nombre}" (PID: ${pid}) -> CONECTADO`);
        } else {
          // El proceso no existe, limpiar PID
          await this.salidaRepository.update(output.id, { 
            procesoFantasmaPid: null, 
            estado: EstadoOutput.APAGADO 
          });
          this.logger.log(`🧹 PID huérfano limpiado: "${output.nombre}" (PID: ${pid}) -> APAGADO`);
        }
      }

      this.logger.log('✅ Recuperación de outputs huérfanos completada');
    } catch (error) {
      this.logger.error('❌ Error en recuperación de outputs huérfanos:', error.message);
    }
  }

  /**
   * Monitorea outputs personalizados habilitados
   */
  async monitorearOutputsPersonalizados(): Promise<void> {
    try {
      const outputsHabilitados = await this.salidaRepository.find({
        where: { habilitada: true },
        relations: ['entrada'],
      });

      this.logger.debug(`🔍 Monitoreando ${outputsHabilitados.length} outputs personalizados`);

      for (const output of outputsHabilitados) {
        // Solo procesar outputs personalizados (no HLS, RTMP Pull, SRT Pull)
        if (this.esOutputPersonalizado(output)) {
          await this.verificarYActualizarEstado(output);
        }
      }
    } catch (error) {
      this.logger.error('❌ Error monitoreando outputs personalizados:', error.message);
    }
  }

  /**
   * Verifica y actualiza el estado de un output específico
   */
  async verificarYActualizarEstado(output: SalidaStream): Promise<void> {
    const pid = output.procesoFantasmaPid;
    const estadoActual = output.estado;
    
    // Si el output no está habilitado, debería estar apagado
    if (!output.habilitada) {
      if (estadoActual !== EstadoOutput.APAGADO) {
        await this.salidaRepository.update(output.id, { estado: EstadoOutput.APAGADO });
        this.logger.log(`⚫ Output "${output.nombre}": ${estadoActual} -> APAGADO (deshabilitado)`);
      }
      return;
    }
    
    // Verificar si la entrada está activa
    const entradaActiva = output.entrada?.activa || false;
    
    // Si no hay entrada activa, el output debería estar apagado
    if (!entradaActiva) {
      if (estadoActual !== EstadoOutput.APAGADO) {
        await this.salidaRepository.update(output.id, { estado: EstadoOutput.APAGADO });
        this.logger.log(`⚫ Output "${output.nombre}": ${estadoActual} -> APAGADO (entrada inactiva)`);
      }
      return;
    }
    
    // Si no hay PID, verificar el estado actual
    if (!pid) {
      if (estadoActual === EstadoOutput.CONECTANDO) {
        // Si está "conectando" pero no hay PID, algo falló
        await this.salidaRepository.update(output.id, { estado: EstadoOutput.ERROR });
        this.logger.log(`🔴 Output "${output.nombre}": CONECTANDO -> ERROR (no se inició proceso)`);
      } else if (estadoActual !== EstadoOutput.APAGADO) {
        await this.salidaRepository.update(output.id, { estado: EstadoOutput.APAGADO });
        this.logger.log(`⚫ Output "${output.nombre}": ${estadoActual} -> APAGADO (sin PID)`);
      }
      return;
    }
    
    // Verificar si el proceso está corriendo
    const procesoActivo = await this.isProcessRunning(pid);
    
    let nuevoEstado: EstadoOutput;
    
    if (procesoActivo) {
      // Si el proceso está corriendo, está conectado
      nuevoEstado = EstadoOutput.CONECTADO;
    } else {
      // Si el proceso no está corriendo, verificar el estado anterior
      if (estadoActual === EstadoOutput.CONECTANDO) {
        // Si estaba conectando y el proceso murió, es un error
        nuevoEstado = EstadoOutput.ERROR;
      } else if (estadoActual === EstadoOutput.CONECTADO) {
        // Si estaba conectado y el proceso murió, es un error
        nuevoEstado = EstadoOutput.ERROR;
      } else {
        // En otros casos, está apagado
        nuevoEstado = EstadoOutput.APAGADO;
      }
    }
    
    // Solo actualizar si el estado cambió
    if (estadoActual !== nuevoEstado) {
      await this.salidaRepository.update(output.id, { estado: nuevoEstado });
      
      const emoji = {
        [EstadoOutput.APAGADO]: '⚫',
        [EstadoOutput.CONECTANDO]: '🟠',
        [EstadoOutput.CONECTADO]: '🟢',
        [EstadoOutput.ERROR]: '🔴'
      }[nuevoEstado];
      
      this.logger.log(`${emoji} Output "${output.nombre}": ${estadoActual} -> ${nuevoEstado} (PID: ${pid})`);
    }
  }

  /**
   * Actualiza el estado de un output específico
   */
  async actualizarEstadoOutput(outputId: string, nuevoEstado: EstadoOutput): Promise<void> {
    await this.salidaRepository.update(outputId, { estado: nuevoEstado });
    this.logger.log(`🔄 Estado de output ${outputId} actualizado a: ${nuevoEstado}`);
  }

  /**
   * Obtiene el estado actual de un output
   */
  async obtenerEstadoOutput(outputId: string): Promise<EstadoOutput> {
    const output = await this.salidaRepository.findOne({ where: { id: outputId } });
    return output?.estado || EstadoOutput.APAGADO;
  }

  /**
   * Verifica si un proceso está corriendo
   */
  private async isProcessRunning(pid: number): Promise<boolean> {
    if (!pid) return false;
    
    try {
      // Usar kill -0 para verificar si el proceso existe sin matarlo
      const result = await this.executeCommand(`kill -0 ${pid}`);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ejecuta un comando del sistema
   */
  private executeCommand(command: string): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      const process = spawn('sh', ['-c', command]);
      let output = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim()
        });
      });
    });
  }

  /**
   * Determina si un output es personalizado (no es HLS, RTMP Pull, SRT Pull)
   */
  private esOutputPersonalizado(output: SalidaStream): boolean {
    const outputsEspeciales = ['HLS', 'RTMP Pull', 'SRT Pull'];
    return !outputsEspeciales.includes(output.nombre);
  }
} 