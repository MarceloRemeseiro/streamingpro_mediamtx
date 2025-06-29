import { EntradaStream } from '../../entrada/entities/entrada.entity';
import { SalidaStream } from '../../salida/entities/salida.entity';

export interface IStreamPathManager {
  createInputPath(entrada: EntradaStream): Promise<void>;
  deleteInputPath(entrada: EntradaStream): Promise<void>;
  createDefaultOutputs(entrada: EntradaStream): Promise<void>;
  activateOutput(salida: SalidaStream): Promise<number>;
  deactivateOutput(salida: SalidaStream, pid: number): Promise<void>;
  syncOutputs(entrada: EntradaStream): Promise<void>;
} 