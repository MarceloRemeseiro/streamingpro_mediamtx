import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import { SalidaStream } from '../../salida/entities/salida.entity';
import { EstadoOutput } from '../../entities/enums';
import { MediaMTXApiService } from '../../media-mtx/services/core/mediamtx-api.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
@Injectable()
export class EstadoSalidasService {
  private readonly logger = new Logger(EstadoSalidasService.name);

  @WebSocketServer()
  server: Server;

  constructor(
    @InjectRepository(SalidaStream)
    private readonly salidaRepository: Repository<SalidaStream>,
    private readonly mediaMTXApiService: MediaMTXApiService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 EstadoSalidasService iniciado');
    // Recuperar outputs huérfanos al iniciar
    await this.recuperarOutputsHuerfanos();
  }

  /**
   * Recupera outputs que quedaron en estado inconsistente
   */
  private async recuperarOutputsHuerfanos(): Promise<void> {
    try {
      const outputsHuerfanos = await this.salidaRepository.find({
        where: [
          { estado: EstadoOutput.CONECTANDO },
          { estado: EstadoOutput.CONECTADO },
        ],
        relations: ['entrada'],
      });

      if (outputsHuerfanos.length > 0) {
        this.logger.log(`🔄 Recuperando ${outputsHuerfanos.length} outputs huérfanos...`);
        
        for (const output of outputsHuerfanos) {
          if (!output.habilitada) {
            // Si está deshabilitado, ponerlo como apagado
            await this.actualizarEstadoOutput(output.id, EstadoOutput.APAGADO);
            this.logger.log(`⚫ Output "${output.nombre}" recuperado: -> APAGADO (deshabilitado)`);
          } else {
            // Si está habilitado, verificar su estado real
            await this.verificarEstadoOutput(output);
          }
        }
      }
    } catch (error) {
      this.logger.error('❌ Error recuperando outputs huérfanos:', error.message);
    }
  }

  /**
   * Verifica estados de todos los outputs personalizados habilitados
   */
  async verificarEstadosOutputs(): Promise<void> {
    try {
      const outputsHabilitados = await this.salidaRepository.find({
        where: { habilitada: true },
        relations: ['entrada'],
      });

      const outputsPersonalizados = outputsHabilitados.filter(output => 
        this.esOutputPersonalizado(output)
      );

      if (outputsPersonalizados.length === 0) {
        return;
      }

      this.logger.debug(`🔍 Verificando ${outputsPersonalizados.length} outputs personalizados`);

      // Verificar todos los outputs en paralelo para mejor rendimiento
      const verificaciones = outputsPersonalizados.map(output => 
        this.verificarEstadoOutput(output).catch(error => {
          this.logger.error(`Error verificando output ${output.nombre}:`, error.message);
        })
      );

      await Promise.all(verificaciones);
    } catch (error) {
      this.logger.error('❌ Error verificando estados de outputs:', error.message);
    }
  }

  /**
   * Verifica y actualiza el estado de un output específico usando proceso FFmpeg y entrada MediaMTX
   * Estados: APAGADO (⚫), CONECTANDO (🟠), CONECTADO (🟢), ERROR (🔴)
   */
  async verificarEstadoOutput(output: SalidaStream): Promise<void> {
    const estadoActual = output.estado;
    const pid = output.procesoFantasmaPid;
    
    // Si el output no está habilitado, debería estar apagado
    if (!output.habilitada) {
      if (estadoActual !== EstadoOutput.APAGADO) {
        await this.actualizarEstadoOutput(output.id, EstadoOutput.APAGADO);
        this.logger.log(`⚫ Output "${output.nombre}": ${estadoActual} -> APAGADO (deshabilitado)`);
        this.emitirCambioOutput(output, EstadoOutput.APAGADO);
      }
      return;
    }
    
    // Verificar si la entrada está activa consultando MediaMTX
    const inputPathName = this.generarPathEntrada(output.entrada);
    let entradaFuncionando = false;
    
    try {
      const inputStatus = await this.mediaMTXApiService.verifyPathStatus(inputPathName);
      entradaFuncionando = inputStatus.ready && inputStatus.bytesReceived > 0;
      
      this.logger.debug(`🔍 Entrada "${inputPathName}": ready=${inputStatus.ready}, bytes=${inputStatus.bytesReceived}`);
    } catch (error) {
      this.logger.warn(`⚠️ No se pudo verificar entrada "${inputPathName}":`, error.message);
      // Si no podemos verificar la entrada, asumir que está funcionando si tiene estado activo
      entradaFuncionando = output.entrada?.activa || false;
    }
    
    // Si no hay entrada funcionando, el output debería estar apagado
    if (!entradaFuncionando) {
      if (estadoActual !== EstadoOutput.APAGADO) {
        await this.actualizarEstadoOutput(output.id, EstadoOutput.APAGADO);
        this.logger.log(`⚫ Output "${output.nombre}": ${estadoActual} -> APAGADO (entrada no funciona)`);
        this.emitirCambioOutput(output, EstadoOutput.APAGADO);
      }
      return;
    }

    // Verificar el estado del proceso FFmpeg
    let nuevoEstado: EstadoOutput;
    
    if (!pid) {
      // No hay proceso
      if (estadoActual === EstadoOutput.CONECTANDO) {
        // Estaba conectando pero no hay proceso - falló
        nuevoEstado = EstadoOutput.ERROR;
      } else {
        nuevoEstado = EstadoOutput.APAGADO;
      }
    } else {
      // Hay PID, verificar si el proceso existe
      const procesoActivo = await this.isProcessRunning(pid);
      
      if (procesoActivo) {
        // El proceso está corriendo
        if (estadoActual === EstadoOutput.CONECTANDO) {
          // Si estaba conectando, verificar si ya lleva tiempo para considerarlo conectado
          const tiempoEsperaMs = 15000; // 15 segundos
          const tiempoTranscurrido = Date.now() - (output.updatedAt?.getTime() || 0);
          
          if (tiempoTranscurrido > tiempoEsperaMs) {
            // Ha pasado suficiente tiempo, considerar conectado
            nuevoEstado = EstadoOutput.CONECTADO;
          } else {
            // Mantener conectando
            return;
          }
        } else {
          // El proceso está corriendo, está conectado
          nuevoEstado = EstadoOutput.CONECTADO;
        }
      } else {
        // El proceso no está corriendo
        if (estadoActual === EstadoOutput.CONECTANDO || estadoActual === EstadoOutput.CONECTADO) {
          // Estaba funcionando pero el proceso murió - es un error
          nuevoEstado = EstadoOutput.ERROR;
          
          // Limpiar el PID huérfano
          await this.salidaRepository.update(output.id, { procesoFantasmaPid: null });
          this.logger.debug(`🧹 PID huérfano limpiado para "${output.nombre}"`);
        } else {
          // En otros casos, está apagado
          nuevoEstado = EstadoOutput.APAGADO;
        }
      }
      
      // Solo actualizar si el estado cambió
      if (estadoActual !== nuevoEstado) {
        await this.actualizarEstadoOutput(output.id, nuevoEstado);
        
        const emoji = {
          [EstadoOutput.APAGADO]: '⚫',
          [EstadoOutput.CONECTANDO]: '🟠',
          [EstadoOutput.CONECTADO]: '🟢',
          [EstadoOutput.ERROR]: '🔴'
        }[nuevoEstado];
        
        const razon = `Proceso: ${procesoActivo ? 'activo' : 'inactivo'}, Entrada: ${entradaFuncionando ? 'OK' : 'NO'}`;
        this.logger.log(`${emoji} Output "${output.nombre}": ${estadoActual} -> ${nuevoEstado} (${razon})`);
        this.emitirCambioOutput(output, nuevoEstado);
      }
    }
  }

  /**
   * Genera el nombre del path de entrada en MediaMTX
   * NOTA: Este método es solo para paths de entrada, no para outputs personalizados
   */
  private generarPathEntrada(entrada: any): string {
    // Coincidir con la lógica de PathManagerService.generateInputPathName()
    if (entrada.protocolo === 'RTMP') {
      return `live/${entrada.streamKey}`;
    }
    if (entrada.protocolo === 'SRT') {
      return entrada.streamId?.replace('publish:', '') || entrada.nombre;
    }
    return entrada.streamKey || entrada.nombre.toLowerCase().replace(/\s+/g, '_');
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
   * Actualiza el estado de un output en la base de datos
   */
  private async actualizarEstadoOutput(outputId: string, nuevoEstado: EstadoOutput): Promise<void> {
    await this.salidaRepository.update(outputId, { 
      estado: nuevoEstado,
      updatedAt: new Date()
    });
  }

  /**
   * Establece el estado de un output (usado por SalidaService)
   */
  async establecerEstadoOutput(outputId: string, estado: EstadoOutput): Promise<void> {
    await this.actualizarEstadoOutput(outputId, estado);
    
    // Buscar el output para emitir evento
    const output = await this.salidaRepository.findOne({ 
      where: { id: outputId },
      relations: ['entrada']
    });
    
    if (output) {
      this.emitirCambioOutput(output, estado);
      
      // Si se establece como CONECTANDO, programar verificación después de un tiempo
      if (estado === EstadoOutput.CONECTANDO) {
        setTimeout(async () => {
          const outputActualizado = await this.salidaRepository.findOne({ 
            where: { id: outputId },
            relations: ['entrada']
          });
          if (outputActualizado && outputActualizado.estado === EstadoOutput.CONECTANDO) {
            await this.verificarEstadoOutput(outputActualizado);
          }
        }, 10000); // Verificar después de 10 segundos
      }
    }
  }

  /**
   * Emite evento WebSocket cuando cambia el estado de un output
   */
  private emitirCambioOutput(output: SalidaStream, nuevoEstado: EstadoOutput): void {
    try {
      if (this.server) {
        this.server.emit('output-status-change', {
          entradaId: output.entradaId,
          outputId: output.id,
          nombre: output.nombre,
          estado: nuevoEstado,
          procesoFantasmaPid: output.procesoFantasmaPid,
          timestamp: new Date().toISOString(),
        });

        this.logger.debug(`📡 WebSocket: output-status-change emitido para "${output.nombre}" -> ${nuevoEstado}`);
      }
    } catch (error) {
      this.logger.error('Error emitiendo cambio de output:', error.message);
    }
  }

  /**
   * Determina si un output es personalizado (no es HLS, RTMP Pull, SRT Pull)
   */
  private esOutputPersonalizado(output: SalidaStream): boolean {
    const outputsEspeciales = ['HLS', 'RTMP Pull', 'SRT Pull'];
    return !outputsEspeciales.includes(output.nombre);
  }
} 