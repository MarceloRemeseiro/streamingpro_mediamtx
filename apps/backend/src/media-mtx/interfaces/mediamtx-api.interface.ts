/**
 * Interfaces para la API v3 de MediaMTX
 * Basado en la documentación oficial: https://bluenviron.github.io/mediamtx/
 */

export interface MediaMTXPathConfig {
  name: string;
  source?: string;
  sourceOnDemand?: boolean;
  sourceFingerprint?: string;
  
  // SRT specific configuration
  srtReadPassphrase?: string;
  srtPublishPassphrase?: string;
  
  // RTMP specific configuration
  rtmpReadPass?: string;
  rtmpPublishPass?: string;
  
  // Recording
  record?: boolean;
  recordPath?: string;
  recordFormat?: 'fmp4' | 'mpegts';
  recordPartDuration?: string;
  recordSegmentDuration?: string;
  recordDeleteAfter?: string;
  
  // General publishing settings
  overridePublisher?: boolean;
  fallback?: string;
  
  // Permissions
  publishPermissions?: string[];
  readPermissions?: string[];
  
  // Hooks
  runOnInit?: string;
  runOnInitRestart?: boolean;
  runOnDemand?: string;
  runOnDemandRestart?: boolean;
  runOnDemandStartTimeout?: string;
  runOnDemandCloseAfter?: string;
  runOnUnDemand?: string;
  runOnReady?: string;
  runOnNotReady?: string;
  runOnRead?: string;
  runOnUnread?: string;
  runOnRecordSegmentCreate?: string;
  runOnRecordSegmentComplete?: string;
}

export interface MediaMTXPathInfo {
  name: string;
  confName: string;
  source: string;
  ready: boolean;
  readyTime?: string;
  tracks: string[];
  bytesReceived: number;
  bytesSent: number;
  readers: MediaMTXReaderInfo[];
}

export interface MediaMTXReaderInfo {
  type: 'rtmpConn' | 'rtspConn' | 'srtConn' | 'webRTCSession' | 'hlsMuxer';
  id: string;
}

export interface MediaMTXConnectionInfo {
  id: string;
  created: string;
  remoteAddr: string;
  path: string;
  state: 'idle' | 'read' | 'publish';
  bytesReceived: number;
  bytesSent: number;
}

export interface MediaMTXSRTConnectionInfo extends MediaMTXConnectionInfo {
  streamId: string;
  rttMs: number;
  packetsReceived: number;
  packetsSent: number;
  packetsReceivedLost: number;
  packetsSentLost: number;
  packetsReceivedDrop: number;
  packetsSentDrop: number;
  packetsReceivedRetrans: number;
  packetsSentRetrans: number;
  packetsReceivedBelated: number;
  packetsReceivedAvgBelated: number;
  packetsReceivedFilterExtra: number;
  packetsReceivedFilterSupply: number;
  packetsReceivedFilterLoss: number;
  mbpsReceived: number;
  mbpsSent: number;
}

export interface MediaMTXRTMPConnectionInfo extends MediaMTXConnectionInfo {
  // RTMP específico se puede extender aquí
}

export interface MediaMTXRTSPConnectionInfo extends MediaMTXConnectionInfo {
  // RTSP específico se puede extender aquí
}

export interface StreamingUrls {
  rtmp: {
    publish: string;
    play: string;
  };
  srt: {
    publish: string;
    play: string;
  };
  rtsp: {
    publish: string;
    play: string;
  };
  hls: {
    play: string;
  };
}

export interface MediaMTXErrorResponse {
  error: string;
}

export interface MediaMTXResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
} 