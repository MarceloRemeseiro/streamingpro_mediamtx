import { EntradaStream } from '../../entrada/entities/entrada.entity';
import { SalidaStream } from '../../salida/entities/salida.entity';
import { MediaMTXPathConfig } from './mediamtx-api.interface';

/**
 * Interfaces para la integración entre entidades de BD y MediaMTX
 */

export interface IStreamPathManager {
  /**
   * Crea un path de entrada en MediaMTX
   */
  createInputPath(entrada: EntradaStream, salidas: SalidaStream[]): Promise<void>;

  /**
   * Actualiza un path de entrada existente
   */
  updateInputPath(entrada: EntradaStream, salidas: SalidaStream[]): Promise<void>;

  /**
   * Elimina un path de entrada
   */
  deleteInputPath(entrada: EntradaStream): Promise<void>;

  /**
   * Activa una salida específica
   */
  activateOutput(salida: SalidaStream): Promise<void>;

  /**
   * Desactiva una salida específica
   */
  deactivateOutput(salida: SalidaStream): Promise<void>;

  /**
   * Sincroniza todas las salidas de una entrada
   */
  syncOutputsForInput(entrada: EntradaStream, salidas: SalidaStream[]): Promise<void>;
}

export interface IStreamSyncService {
  /**
   * Sincroniza el estado de todas las entradas con MediaMTX
   */
  syncInputStates(): Promise<void>;

  /**
   * Sincroniza el estado de una entrada específica
   */
  syncInputState(entrada: EntradaStream): Promise<boolean>;
}

export interface StreamPathConfig {
  pathName: string;
  inputName: string;
  config: Partial<MediaMTXPathConfig>;
}

export interface OutputStreamConfig {
  salida: SalidaStream;
  command: string;
  pathName: string;
}

export interface StreamingEndpoints {
  inputPath: string;
  outputPaths: string[];
}

export interface StreamMetrics {
  pathName: string;
  ready: boolean;
  bytesReceived: number;
  bytesSent: number;
  activeConnections: number;
  lastUpdate: Date;
} 