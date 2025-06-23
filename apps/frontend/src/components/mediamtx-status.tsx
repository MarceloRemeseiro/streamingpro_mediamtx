"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { config } from '@/lib/config';

interface MediaMTXStatus {
  activo: boolean;
  mensaje: string;
}

interface MediaMTXPath {
  name: string;
  ready: boolean;
  tracks: string[]; // Array de strings según el backend
  bytesReceived: number;
  readers?: number; // Opcional porque puede no existir
}

export function MediaMTXStatus() {
  const [status, setStatus] = useState<MediaMTXStatus | null>(null);
  const [paths, setPaths] = useState<MediaMTXPath[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [statusRes, pathsRes] = await Promise.all([
        fetch(`${config.api.baseUrl}/streams/mediamtx/health`),
        fetch(`${config.api.baseUrl}/streams/mediamtx/paths`)
      ]);

      if (!statusRes.ok || !pathsRes.ok) {
        throw new Error('Error al obtener estado de MediaMTX');
      }

      const statusData = await statusRes.json();
      const pathsData = await pathsRes.json();

      // Debug temporal: ver qué datos recibimos
      console.log('MediaMTX Status Data:', statusData);
      console.log('MediaMTX Paths Data:', pathsData);

      setStatus(statusData);
      // Asegurar que paths es un array válido
      const pathsArray = Array.isArray(pathsData.paths) ? pathsData.paths : [];
      console.log('Processed paths array:', pathsArray);
      setPaths(pathsArray);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Estado MediaMTX</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {status && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {status.activo ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">{status.mensaje}</span>
              <Badge variant={status.activo ? 'default' : 'destructive'}>
                {status.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Streams Activos ({paths.length})</h4>
          {paths.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay streams activos</p>
          ) : (
            <div className="space-y-1">
              {paths.map((path, index) => {
                // Validar que path es un objeto válido
                if (!path || typeof path !== 'object') {
                  return null;
                }
                
                return (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant={path.ready ? 'default' : 'secondary'} className="text-xs">
                        {path.ready ? '🟢' : '🔴'}
                      </Badge>
                      <code>{path.name || 'Unknown'}</code>
                    </div>
                    <div className="flex gap-2 text-muted-foreground">
                      <span>Tracks: {Array.isArray(path.tracks) ? path.tracks.length : 0}</span>
                      <span>Bytes: {path.bytesReceived || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div><strong>URLs de Configuración:</strong></div>
          <div>RTMP: rtmp://{config.mediamtx.baseHost}:{config.mediamtx.rtmpPort}/live/STREAM_KEY</div>
          <div>SRT: srt://{config.mediamtx.baseHost}:{config.mediamtx.srtPort}?streamid=publish:STREAM_ID</div>
          <div>HLS: http://{config.mediamtx.baseHost}:{config.mediamtx.hlsPort}/PATH/index.m3u8</div>
        </div>
      </CardContent>
    </Card>
  );
} 