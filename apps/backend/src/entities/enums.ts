export enum RolUsuario {
  ADMIN = 'ADMIN',
  TECNICO = 'TECNICO',
  VISOR = 'VISOR',
}

export enum ProtocoloStream {
  RTMP = 'RTMP',
  SRT = 'SRT',
}

export enum ProtocoloSalida {
  RTMP = 'RTMP',
  SRT = 'SRT',
  HLS = 'HLS',
  RTMPS = 'RTMPS',
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