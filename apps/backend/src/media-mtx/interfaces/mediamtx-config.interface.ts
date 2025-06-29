import { SalidaStream } from '../../salida/entities/salida.entity';

export interface MediaMTXPathConfig {
  source?: string;
  runOnInit?: string;
  runOnInitRestart?: boolean;
  runOnDemand?: string;
  runOnDemandRestart?: boolean;
  hlsAlwaysRemux?: boolean;
  hlsVariant?: 'lowLatency' | 'mpegts' | 'fmp4';
  hlsSegmentDuration?: string;
  hlsPartDuration?: string;
}

export interface MediaMTXPaths {
  [key: string]: MediaMTXPathConfig;
}

export interface MediaMTXConfig {
  paths: MediaMTXPaths;
}

export interface OutputStreamConfig {
  salida: SalidaStream;
  command: string;
  pathName: string;
} 