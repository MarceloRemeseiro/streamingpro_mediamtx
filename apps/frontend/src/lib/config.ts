/**
 * Configuración centralizada para URLs y endpoints
 * Permite fácil transición entre desarrollo y producción
 */

// URLs base del sistema
export const config = {
  // Backend API
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  
  // MediaMTX endpoints
  mediamtx: {
    // Puerto para streams HLS
    hlsPort: process.env.NEXT_PUBLIC_HLS_PORT || '8888',
    
    // Host base para MediaMTX (sin puerto)
    baseHost: process.env.NEXT_PUBLIC_MEDIAMTX_HOST || 'localhost',
    
    // URLs completas para diferentes protocolos
    rtmpPort: process.env.NEXT_PUBLIC_RTMP_PORT || '1935',
    srtPort: process.env.NEXT_PUBLIC_SRT_PORT || '8890',
    
    // Generar URLs dinámicamente
    getHlsUrl: (streamPath: string) => {
      const host = config.mediamtx.baseHost;
      const port = config.mediamtx.hlsPort;
      return `http://${host}:${port}/${streamPath}/index.m3u8`;
    },
    
    getRtmpUrl: (streamKey: string) => {
      const host = config.mediamtx.baseHost;
      const port = config.mediamtx.rtmpPort;
      return `rtmp://${host}:${port}/live/${streamKey}`;
    },
    
    getSrtUrl: (streamId: string, passphrase?: string) => {
      const host = config.mediamtx.baseHost;
      const port = config.mediamtx.srtPort;
      let url = `srt://${host}:${port}?streamid=${streamId}`;
      if (passphrase) {
        url += `&passphrase=${passphrase}`;
      }
      return url;
    },
  },
  
  // Configuración de desarrollo vs producción
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

// Validación de configuración
export function validateConfig() {
  const warnings: string[] = [];
  
  if (!process.env.NEXT_PUBLIC_API_URL && config.isProduction) {
    warnings.push('NEXT_PUBLIC_API_URL no está configurada para producción');
  }
  
  if (!process.env.NEXT_PUBLIC_MEDIAMTX_HOST && config.isProduction) {
    warnings.push('NEXT_PUBLIC_MEDIAMTX_HOST no está configurada para producción');
  }
  
  if (warnings.length > 0) {
    console.warn('Advertencias de configuración:', warnings);
  }
  
  return warnings.length === 0;
}

// Configuración por defecto para desarrollo local
export const defaultDevConfig = {
  apiUrl: 'http://localhost:3000',
  mediamtxHost: 'localhost',
  hlsPort: '8888',
  rtmpPort: '1935',
  srtPort: '8890',
} as const; 