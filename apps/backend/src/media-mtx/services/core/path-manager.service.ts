import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, ChildProcess } from 'child_process';
import { ProtocoloSalida, ProtocoloStream } from 'src/entities/enums';
import { EntradaStream } from '../../../entrada/entities/entrada.entity';
import { SalidaStream } from '../../../salida/entities/salida.entity';
import { MediaMTXApiService } from './mediamtx-api.service';
import { IStreamPathManager } from '../../interfaces/stream-path-manager.interface';
import {
  MediaMTXPathConfig,
  OutputStreamConfig,
} from '../../interfaces/mediamtx-config.interface';

/**
 * Servicio gestor de paths que implementa la lógica de negocio
 * Actúa como capa de abstracción entre las entidades y MediaMTX
 */
@Injectable()
export class PathManagerService implements IStreamPathManager {
  private readonly logger = new Logger(PathManagerService.name);
  private readonly activeProcesses = new Map<string, ChildProcess>();

  constructor(
    private readonly apiService: MediaMTXApiService,
    private readonly configService: ConfigService,
  ) {}

  // =============================================================================
  // GESTIÓN DE ENTRADAS (INPUTS)
  // =============================================================================

  async createDefaultOutputs(entrada: EntradaStream): Promise<void> {
    this.logger.log(
      `Creando salidas por defecto para el path de entrada '${this.generateInputPathName(
        entrada,
      )}'`,
    );
  }

  async createInputPath(entrada: EntradaStream): Promise<void> {
    const pathName = this.generateInputPathName(entrada);
    this.logger.log(
      `Creando path de entrada '${pathName}' para '${entrada.nombre}'`,
    );
  }

  async deleteInputPath(entrada: EntradaStream): Promise<void> {
    const pathName = this.generateInputPathName(entrada);
    this.logger.log(
      `Eliminando path de entrada '${pathName}' para '${entrada.nombre}'`,
    );
  }

  async syncOutputs(entrada: EntradaStream): Promise<void> {
    // Lógica de sincronización pendiente
  }

  // =============================================================================
  // GESTIÓN DE SALIDAS (OUTPUTS) - NUEVA ARQUITECTURA SIMPLIFICADA
  // =============================================================================

  async activateOutput(salida: SalidaStream): Promise<number> {
    const pathName = this.generateOutputVirtualPathName(salida);
    
    this.logger.log(
      `🚀 Activando salida '${salida.nombre}' con arquitectura simplificada`,
    );

    try {
      // Crear path virtual que ejecutará ffmpeg directamente cuando el stream esté listo
      const ffmpegProcess = this.startDirectFfmpegProcess(salida);
      
      if (!ffmpegProcess.pid) {
        throw new Error('No se pudo iniciar el proceso ffmpeg');
      }

      // Guardar referencia del proceso
      this.activeProcesses.set(salida.id, ffmpegProcess);

      this.logger.log(
        `✅ Salida '${salida.nombre}' activada con PID: ${ffmpegProcess.pid}`,
      );
      
      return ffmpegProcess.pid;
    } catch (error) {
      this.logger.error(
        `❌ Error activando salida '${salida.nombre}':`,
        error.message,
      );
      throw new Error(`Error activando salida: ${error.message}`);
    }
  }

  async deactivateOutput(salida: SalidaStream, pid: number): Promise<void> {
    this.logger.log(
      `🛑 Desactivando salida '${salida.nombre}'`,
    );

    try {
      // Obtener proceso del mapa
      const process = this.activeProcesses.get(salida.id);
      
      if (process && !process.killed) {
        this.logger.log(`🔪 Terminando proceso ffmpeg con PID: ${process.pid}`);
        process.kill('SIGTERM');
        
        // Dar tiempo para terminación graceful, luego forzar si es necesario
        setTimeout(() => {
          if (!process.killed) {
            this.logger.warn(`⚡ Forzando terminación del proceso ${process.pid}`);
            process.kill('SIGKILL');
          }
        }, 5000);
      }

      // Remover del mapa
      this.activeProcesses.delete(salida.id);

      this.logger.log(
        `✅ Salida '${salida.nombre}' desactivada exitosamente`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error desactivando salida '${salida.nombre}':`,
        error.message,
      );
    }
  }

  // =============================================================================
  // MÉTODOS PRIVADOS - NUEVA LÓGICA SIMPLIFICADA
  // =============================================================================

  private startDirectFfmpegProcess(salida: SalidaStream): ChildProcess {
    const inputUrl = this.generateInputUrl(salida.entrada);
    const outputUrl = this.buildOutputUrl(salida);

    this.logger.log(
      `🎬 Iniciando proceso ffmpeg directo para '${salida.nombre}'`,
    );
    this.logger.debug(`📥 Input URL: ${inputUrl}`);
    this.logger.debug(`📤 Output URL: ${outputUrl}`);

    // Construir argumentos base
    const args = [
      '-re',                    // Leer input a velocidad nativa
      '-i', inputUrl,           // URL de entrada
      '-c', 'copy',             // Copiar streams sin recodificar
    ];

    // Agregar parámetros específicos según el protocolo
    if (salida.protocolo === ProtocoloSalida.SRT) {
      // Parámetros específicos para SRT
      args.push('-fflags', '+genpts');  // Generar timestamps si es necesario
      args.push('-avoid_negative_ts', 'make_zero'); // Evitar timestamps negativos
    }

    // Formato y URL de salida
    args.push('-f', this.getOutputFormat(salida));
    args.push(outputUrl);

    this.logger.debug(`🎬 Comando ffmpeg: ffmpeg ${args.join(' ')}`);

    const ffmpegProcess = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Configurar logging
    ffmpegProcess.stdout.on('data', (data) => {
      this.logger.debug(`[FFMPEG-OUT]: ${data}`);
    });

    ffmpegProcess.stderr.on('data', (data) => {
      this.logger.debug(`[FFMPEG-ERR]: ${data}`);
    });

    ffmpegProcess.on('close', (code, signal) => {
      this.logger.log(
        `[FFMPEG]: Proceso '${salida.nombre}' terminado con código ${code}, señal: ${signal}`,
      );
      // Limpiar del mapa cuando termine
      this.activeProcesses.delete(salida.id);
    });

    ffmpegProcess.on('error', (err) => {
      this.logger.error(
        `❌ Error en proceso ffmpeg para '${salida.nombre}': ${err.message}`,
      );
      this.activeProcesses.delete(salida.id);
    });

    return ffmpegProcess;
  }

  private generateInputUrl(entrada: EntradaStream): string {
    const rtmpPort = this.configService.get('RTMP_PORT');
    const inputPath = this.generateInputPathName(entrada);
    
    // Usar el path live/<stream_key> que es donde MediaMTX recibe los streams RTMP
    return `rtmp://mediamtx:${rtmpPort}/${inputPath}`;
  }

  private generateOutputVirtualPathName(salida: SalidaStream): string {
    return `_output_${salida.id.replace(/-/g, '')}`;
  }

  // =============================================================================
  // MÉTODOS EXISTENTES (sin cambios)
  // =============================================================================

  public generateInputPathName(entrada: EntradaStream): string {
    if (entrada.protocolo === ProtocoloStream.RTMP) {
      return `live/${entrada.streamKey}`;
    }
    // Para SRT, el path es simplemente el identificador (el streamId sin el prefijo)
    if (entrada.protocolo === ProtocoloStream.SRT) {
      return entrada.streamId.replace('publish:', '');
    }
    // Fallback por si acaso
    return entrada.streamKey || entrada.nombre.toLowerCase().replace(/\\s+/g, '_');
  }

  private buildInputPathConfig(
    entrada: EntradaStream,
    salidas: SalidaStream[],
  ): Partial<MediaMTXPathConfig> {
    const config: Partial<MediaMTXPathConfig> = {};

    if (salidas && salidas.length > 0) {
      const outputConfigs = salidas.map((salida) =>
        this.buildOutputConfig(salida),
      );
      // Lógica adicional si es necesaria
    }

    return config;
  }

  private buildOutputConfig(salida: SalidaStream): OutputStreamConfig {
    return {
      salida: salida,
      command: this.generateFfmpegCommand(salida, salida.entrada),
      pathName: this.generateOutputVirtualPathName(salida),
    };
  }

  private buildOutputUrl(salida: SalidaStream): string {
    let baseUrl = salida.urlDestino;
    
    this.logger.debug(`🔗 Construyendo URL para ${salida.protocolo}: ${baseUrl}`);
    this.logger.debug(`📊 Datos de salida:`, {
      id: salida.id,
      nombre: salida.nombre,
      protocolo: salida.protocolo,
      urlDestino: salida.urlDestino,
      puertoSRT: salida.puertoSRT,
      streamIdSRT: salida.streamIdSRT,
      passphraseSRT: salida.passphraseSRT ? '***' : null,
      latenciaSRT: salida.latenciaSRT
    });

    if (salida.protocolo === ProtocoloSalida.RTMP && salida.claveStreamRTMP) {
      if (!baseUrl.endsWith('/')) {
        baseUrl += '/';
      }
      baseUrl += salida.claveStreamRTMP;
    }

    if (salida.protocolo === ProtocoloSalida.SRT) {
      // Para SRT, construir la URL usando el puerto específico del campo puertoSRT
      try {
        const url = new URL(baseUrl);
        
        // Usar el puerto específico de la salida, no el de la URL
        if (salida.puertoSRT) {
          url.port = salida.puertoSRT.toString();
        } else if (!url.port) {
          // Solo usar puerto por defecto si no hay puerto específico NI en la URL
          url.port = '778';
        }
        
        baseUrl = url.toString();
        
        // Solo agregar parámetros si existen
        if (this.hasSrtParameters(salida)) {
          const params = new URLSearchParams();
          
          // Parámetros SRT estándar
          if (salida.latenciaSRT) {
            params.append('latency', salida.latenciaSRT.toString());
          }
          if (salida.passphraseSRT) {
            params.append('passphrase', salida.passphraseSRT);
          }
          if (salida.streamIdSRT) {
            params.append('streamid', salida.streamIdSRT);
          }
          
          // Agregar parámetros adicionales para mejor compatibilidad
          params.append('mode', 'caller'); // Modo caller para salidas
          params.append('transtype', 'live'); // Tipo de transmisión en vivo
          
          baseUrl += `?${params.toString()}`;
        }
        
        this.logger.debug(`🔗 URL SRT construida: ${baseUrl}`);
        
      } catch (error) {
        this.logger.error(`❌ Error construyendo URL SRT: ${error.message}`);
        this.logger.debug(`📋 URL original problemática: ${baseUrl}`);
        throw new Error(`URL SRT inválida: ${baseUrl}`);
      }
    }

    this.logger.debug(`🔗 URL final construida: ${baseUrl}`);
    return baseUrl;
  }

  private generateOutputCommand(inputUrl: string, outputUrl: string, salida: SalidaStream): string {
    const format = this.getOutputFormat(salida);
    return `ffmpeg -re -i ${inputUrl} -c copy -f ${format} ${outputUrl}`;
  }

  private getOutputFormat(salida: SalidaStream): string {
    switch (salida.protocolo) {
      case ProtocoloSalida.RTMP:
      case ProtocoloSalida.RTMPS:
        return 'flv';
      case ProtocoloSalida.SRT:
        return 'mpegts';
      case ProtocoloSalida.HLS:
        return 'hls';
      default:
        return 'flv';
    }
  }

  private hasSrtParameters(salida: SalidaStream): boolean {
    return !!(salida.latenciaSRT || salida.passphraseSRT || salida.streamIdSRT);
  }

  private generateFfmpegCommand(
    salida: SalidaStream,
    entrada: EntradaStream,
  ): string {
    const inputUrl = `rtmp://mediamtx:${this.configService.get('RTMP_PORT')}/${this.generateInputPathName(entrada)}`;
    const outputUrl = this.buildOutputUrl(salida);
    return this.generateOutputCommand(inputUrl, outputUrl, salida);
  }
} 