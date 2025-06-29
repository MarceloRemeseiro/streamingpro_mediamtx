/**
 * Configuración centralizada para URLs de streaming
 * Permite configurar diferentes hosts para desarrollo y producción
 */

export interface StreamingConfig {
  // Host base para URLs de streaming (sin protocolo)
  baseHost: string;
  
  // Puertos para diferentes protocolos
  rtmpPort: number;
  srtPort: number;
  hlsPort: number;
  
  // Protocolo para URLs (http/https)
  protocol: 'http' | 'https';
}

export function getStreamingConfig(): StreamingConfig {
  return {
    baseHost: process.env.STREAMING_HOST || 'localhost',
    rtmpPort: parseInt(process.env.RTMP_PORT || '1935'),
    srtPort: parseInt(process.env.SRT_PORT || '8890'), 
    hlsPort: parseInt(process.env.MEDIAMTX_HLS_PORT || '8888'),
    protocol: (process.env.STREAMING_PROTOCOL as 'http' | 'https') || 'http',
  };
}

export class StreamingUrlGenerator {
  constructor(private config: StreamingConfig) {}
  
  /**
   * Genera URL RTMP para entrada
   */
  generateRtmpUrl(streamKey: string): string {
    return `rtmp://${this.config.baseHost}:${this.config.rtmpPort}/live/${streamKey}`;
  }
  
  /**
   * Genera URL SRT para entrada
   */
  generateSrtUrl(streamId: string, passphrase?: string): string {
    // Para el nuevo formato simple, el streamId ya viene como "publish:HASH"
    // Solo construir la URL base con los parámetros opcionales
    let url = `srt://${this.config.baseHost}:${this.config.srtPort}`;
    
    const params: string[] = [];
    
    // El streamId debe venir ya en formato correcto desde el llamador
    if (streamId) {
      params.push(`streamid=${streamId}`);
    }
    
    if (passphrase) {
      params.push(`passphrase=${passphrase}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    return url;
  }
  
  /**
   * Genera URL HLS para visualización
   */
  generateHlsUrl(pathName: string): string {
    return `${this.config.protocol}://${this.config.baseHost}:${this.config.hlsPort}/${pathName}/index.m3u8`;
  }
  
  /**
   * Extrae el path name para HLS según el protocolo
   */
  extractPathName(protocolo: string, streamKey?: string, streamId?: string): string {
    if (protocolo === 'RTMP' && streamKey) {
      return `live/${streamKey}`;
    } else if (protocolo === 'SRT' && streamId) {
      return streamId.replace('publish:', '');
    }
    throw new Error(`No se pudo extraer path name para protocolo ${protocolo}`);
  }
}

// Instancia singleton
let streamingUrlGenerator: StreamingUrlGenerator;

export function getStreamingUrlGenerator(): StreamingUrlGenerator {
  if (!streamingUrlGenerator) {
    const config = getStreamingConfig();
    streamingUrlGenerator = new StreamingUrlGenerator(config);
  }
  return streamingUrlGenerator;
} 