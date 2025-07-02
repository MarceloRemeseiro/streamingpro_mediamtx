export enum ProtocoloStream {
  RTMP = 'RTMP',
  SRT = 'SRT'
}

export enum ProtocoloSalida {
  RTMP = 'RTMP',
  SRT = 'SRT',
  HLS = 'HLS'
}

/**
 * Estados de conexión para outputs personalizados
 */
export enum EstadoOutput {
  APAGADO = 'apagado',        // Switch a la izquierda, color gris
  CONECTANDO = 'conectando',  // Switch a la derecha, color naranja parpadeando
  CONECTADO = 'conectado',    // Switch a la derecha, color verde fijo
  ERROR = 'error'             // Switch a la derecha, color rojo fijo
}

export interface EntradaStream {
  id: string;
  nombre: string;
  url: string; // URL generada automáticamente
  protocolo: ProtocoloStream;
  streamKey?: string; // Para RTMP - generada automáticamente
  puertoSRT?: number; // Para SRT - estándar MediaMTX 8890
  latenciaSRT?: number; // Para SRT - default 200ms
  passphraseSRT?: string; // Para SRT - generada si se solicita
  streamId?: string; // Para SRT - generado siempre
  activa: boolean; // Estado dinámico: true si hay señal de vídeo activa
  position: number;
  createdAt: string; // Cambiado para coincidir con el backend
  updatedAt: string; // Cambiado para coincidir con el backend
  salidas: SalidaStream[];
}

export interface SalidaStream {
  id: string;
  nombre: string;
  habilitada: boolean;
  activa: boolean; // Estado dinámico: true si la salida está transmitiendo
  protocolo: ProtocoloSalida;
  entradaId: string;
  urlDestino: string;
  position: number;
  estado?: EstadoOutput; // **OPCIONAL: Solo para outputs personalizados**
  // Campos específicos
  streamKey?: string; // Para RTMP
  claveStreamRTMP?: string; // Para salidas RTMP específicas
  puertoSRT?: number; // Para SRT
  passphraseSRT?: string; // Para SRT
  latenciaSRT?: number; // Para SRT
  streamId?: string; // Para SRT (mapeado desde entrada)
  streamIdSRT?: string; // Para SRT (específico del output personalizado)
  // Campos específicos para HLS (si se expanden en el futuro)
  segmentDuration?: number;
  playlistLength?: number;
  createdAt: string; 
  updatedAt: string; 
}

export interface CrearEntradaDto {
  nombre: string;
  protocolo: ProtocoloStream;
  puertoSRT?: number; // Para SRT
  latenciaSRT?: number; // Para SRT - default 200ms
  passphraseSRT?: string; // Para SRT - opcional
}

export interface CrearSalidaDto {
  nombre: string;
  protocolo: ProtocoloSalida;
  entradaId: string;
  urlDestino: string;
  // Campos RTMP
  streamKey?: string;
  // Campos SRT
  puertoSRT?: number;
  passphraseSRT?: string;
  latenciaSRT?: number;
  streamId?: string;
  streamIdSRT?: string;
  // Campos HLS
  segmentDuration?: number;
  playlistLength?: number;
}

// Estadísticas de dispositivos conectados
export interface EstadisticasDispositivos {
  hls: number;
  srt: number;
  rtmp: number;
  total: number;
  byInput: EstadisticasDispositivosPorEntrada[];
}

export interface EstadisticasDispositivosPorEntrada {
  inputName: string;
  streamId: string;
  hls: number;
  srt: number;
  rtmp: number;
  total: number;
} 