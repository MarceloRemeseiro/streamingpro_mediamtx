"use client";

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HLSPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
}

export function HLSPlayer({ 
  src, 
  poster, 
  className = "", 
  autoPlay = false,
  muted = true 
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const offlineCheckRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isRecovering, setIsRecovering] = useState(false);
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'live' | 'offline' | 'error'>('connecting');
  const [retryCount, setRetryCount] = useState(0);
  const [hasConnectedBefore, setHasConnectedBefore] = useState(false);

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (offlineCheckRef.current) {
        clearTimeout(offlineCheckRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Limpiar instancia anterior
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    // Limpiar timeouts anteriores
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (offlineCheckRef.current) {
      clearTimeout(offlineCheckRef.current);
    }

    setIsLoading(true);
    setError(null);
    setIsRecovering(false);
    setStreamStatus('connecting');

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 10,
        maxMaxBufferLength: 30,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 3,
        liveDurationInfinity: true,
        debug: false,
        // Timeouts más tolerantes
        fragLoadingTimeOut: 60000, // 60 segundos - muy tolerante
        manifestLoadingTimeOut: 30000, // 30 segundos
        levelLoadingTimeOut: 30000, // 30 segundos
        // Configuración de reintentos más agresiva
        fragLoadingMaxRetry: 4, // Más reintentos
        levelLoadingMaxRetry: 4,
        manifestLoadingMaxRetry: 4,
        // Buffer conservador
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 5, // Más intentos de ajuste
        maxFragLookUpTolerance: 0.25,
      });

      hlsRef.current = hls;

      console.log('🎥 Cargando stream:', src);
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ Stream conectado exitosamente');
        setIsLoading(false);
        setIsRecovering(false);
        setError(null);
        setStreamStatus('live');

        setRetryCount(0);
        setHasConnectedBefore(true);
        
        // Limpiar timeout de offline check
        if (offlineCheckRef.current) {
          clearTimeout(offlineCheckRef.current);
        }
        
        if (autoPlay) {
          video.play().catch(console.error);
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        if (isRecovering) {
          setIsRecovering(false);
          setStreamStatus('live');
        }
        // Limpiar timeout de offline check cuando recibimos fragmentos
        if (offlineCheckRef.current) {
          clearTimeout(offlineCheckRef.current);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        // Solo mostrar logs para errores realmente importantes
        if (data.fatal) {
          console.warn('🔴 Error fatal HLS:', data.details, data.type);
        }
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Solo marcar como offline después de muchos intentos
              if (retryCount < 5) {
                setIsRecovering(true);
                setRetryCount(prev => prev + 1);
                
                retryTimeoutRef.current = setTimeout(() => {
                  try {
                    if (hlsRef.current) {
                      hlsRef.current.startLoad();
                      console.log('🔄 Reintentando conexión... (' + (retryCount + 1) + '/5)');
                    }
                  } catch (e) {
                    console.error('Error en reintento:', e);
                  }
                }, 3000 * (retryCount + 1)); // Delay progresivo
              } else {
                // Solo marcar como offline si nunca se conectó antes
                if (!hasConnectedBefore) {
                  setError('Stream no disponible');
                  setStreamStatus('offline');
                } else {
                  setError('Conexión perdida - reintentando...');
                  setIsRecovering(true);
                  // Seguir intentando si ya se había conectado antes
                  retryTimeoutRef.current = setTimeout(() => {
                    setRetryCount(0);
                    if (hlsRef.current) {
                      hlsRef.current.startLoad();
                    }
                  }, 10000);
                }
                setIsLoading(false);
                setIsRecovering(false);
              }
              break;
              
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (retryCount < 3) {
                setIsRecovering(true);
                setRetryCount(prev => prev + 1);
                
                try {
                  hls.recoverMediaError();
                  console.log('🔄 Recuperando error de media...');
                  setTimeout(() => setIsRecovering(false), 5000);
                } catch {
                  setError('Error de formato de video');
                  setStreamStatus('error');
                  setIsLoading(false);
                  setIsRecovering(false);
                }
              } else {
                setError('Error de formato de video');
                setStreamStatus('error');
                setIsLoading(false);
                setIsRecovering(false);
              }
              break;
              
            default:
              // No marcar como offline inmediatamente para otros errores
              if (!hasConnectedBefore) {
                setError('Problema de conexión');
                setIsRecovering(true);
                retryTimeoutRef.current = setTimeout(() => {
                  if (hlsRef.current) {
                    hlsRef.current.loadSource(src);
                  }
                }, 5000);
              }
              break;
          }
        } else {
          // Manejo muy conservador de errores no fatales
          const isStreamUnavailable = [
            'levelLoadTimeOut',
            'audioTrackLoadTimeOut',
            'manifestLoadTimeOut',
            'levelLoadError',
            'audioTrackLoadError'
          ].includes(data.details);

          if (isStreamUnavailable) {
            // Solo marcar como offline después de MUCHO tiempo sin conexión inicial
            if (streamStatus === 'connecting' && !hasConnectedBefore) {
              // Timeout muy largo para primera conexión
              if (!offlineCheckRef.current) {
                offlineCheckRef.current = setTimeout(() => {
                  if (streamStatus === 'connecting' && !hasConnectedBefore) {
                    setError('Stream no disponible actualmente');
                    setStreamStatus('offline');
                    setIsLoading(false);
                  }
                }, 60000); // 60 segundos para marcar como offline
              }
            }
            return; // No procesar más estos errores
          }

          // Otros errores no fatales - manejo silencioso
          switch (data.details) {
            case 'bufferAppendError':
            case 'bufferAppendingError':
              try {
                hls.recoverMediaError();
              } catch {
                retryTimeoutRef.current = setTimeout(() => {
                  if (hlsRef.current) {
                    hlsRef.current.startLoad();
                  }
                }, 1000);
              }
              break;
              
            case 'fragLoadError':
            case 'fragLoadTimeOut':
              retryTimeoutRef.current = setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.startLoad();
                }
              }, 2000);
              break;
          }
        }
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari nativo
      video.src = src;
      setIsLoading(false);
      setStreamStatus('live');
      setHasConnectedBefore(true);
      
      if (autoPlay) {
        video.play().catch(console.error);
      }
    } else {
      setError('Formato de video no soportado en este navegador');
      setStreamStatus('error');
      setIsLoading(false);
    }

    // Event listeners del video
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => setIsMuted(video.muted);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      if (offlineCheckRef.current) {
        clearTimeout(offlineCheckRef.current);
      }
      
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, autoPlay]);

  const handleRetry = () => {
    setRetryCount(0);
    setError(null);
    setIsLoading(true);
    setStreamStatus('connecting');
    setHasConnectedBefore(false);
    
    // Limpiar timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (offlineCheckRef.current) {
      clearTimeout(offlineCheckRef.current);
    }
    
    // Forzar recarga del efecto
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }
    
    // Pequeño delay para asegurar limpieza
    setTimeout(() => {
      // Trigger re-render by changing a key prop or reloading
      window.location.reload();
    }, 100);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(console.error);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
  };

  const goFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  // Estado de stream offline - solo mostrar si realmente no hay stream
  if (streamStatus === 'offline') {
    return (
      <div className={`relative bg-gray-900 rounded-md aspect-video flex items-center justify-center ${className}`}>
        <div className="text-center text-white p-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <div className="text-lg font-medium mb-2">Stream No Disponible</div>
          <div className="text-sm text-gray-400 mb-4">
            El stream no está activo en este momento
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
            className="bg-transparent border-gray-600 text-white hover:bg-gray-800"
          >
            Reintentar Conexión
          </Button>
        </div>
      </div>
    );
  }

  // Estado de error
  if (error && streamStatus === 'error') {
    return (
      <div className={`relative bg-red-950 rounded-md aspect-video flex items-center justify-center ${className}`}>
        <div className="text-center text-white p-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div className="text-lg font-medium mb-2 text-red-100">Error de Reproducción</div>
          <div className="text-sm text-red-200 mb-4">{error}</div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
            className="bg-transparent border-red-600 text-red-100 hover:bg-red-900"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black rounded-md aspect-video group ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full rounded-md"
        poster={poster}
        muted={muted}
        playsInline
        controls={false}
      />

      {/* Loading/Connecting overlay */}
      {(isLoading || isRecovering) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-md">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-3"></div>
            <div className="text-sm font-medium mb-1">
              {isRecovering ? 'Reconectando...' : 'Conectando al stream...'}
            </div>
            {retryCount > 0 && (
              <div className="text-xs text-gray-400">
                Intento {retryCount} de {streamStatus === 'connecting' ? '5' : '3'}
              </div>
            )}
                         {error && !['error', 'offline'].includes(streamStatus) && (
               <div className="text-xs text-yellow-400 mt-2">
                 {error}
               </div>
             )}
          </div>
        </div>
      )}

      {/* Badge EN VIVO removido por petición del usuario */}

      {/* Controls overlay - ESTILO YOUTUBE */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white hover:bg-opacity-20"
              onClick={togglePlay}
              disabled={streamStatus !== 'live'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white hover:bg-opacity-20"
              onClick={toggleMute}
              disabled={streamStatus !== 'live'}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white hover:bg-opacity-20"
              onClick={goFullscreen}
              disabled={streamStatus !== 'live'}
            >
              <Maximize2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>


    </div>
  );
} 