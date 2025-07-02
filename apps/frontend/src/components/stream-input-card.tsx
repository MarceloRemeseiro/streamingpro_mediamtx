"use client";

import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Radio,
  Settings2,
  Plus,
  Trash2,
  Edit,
  GripVertical,
  Minus
} from 'lucide-react';
import { EntradaStream, ProtocoloStream, SalidaStream, EstadisticasDispositivos } from '@/types/streaming';
import { EditEntradaModal } from './edit-entrada-modal';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { useCollapseState } from '@/lib/hooks';
import { StreamVideoSection } from './stream-video-section';
import { StreamConnectionData } from './stream-connection-data';
import { StreamOutputsSection } from './stream-outputs-section';
import { useCopyToClipboard } from '@/lib/use-copy-to-clipboard';
import { DraggableSyntheticListeners } from '@dnd-kit/core';

interface StreamInputCardProps {
  entrada: EntradaStream;
  stats?: EstadisticasDispositivos | null;
  dragListeners: DraggableSyntheticListeners;
  isDragging: boolean;
  onEliminar: (id: string) => void;
  onEliminarSalida: (id: string) => void;
  onActualizarSalida: (salidaId: string, activa: boolean) => void;
  onEntradaActualizada: () => void;
  onReorderOutputs: (reorderedOutputs: SalidaStream[]) => void;
}

export function StreamInputCard({ 
  entrada, 
  stats,
  dragListeners,
  isDragging,
  onEliminar, 
  onEliminarSalida,
  onActualizarSalida, 
  onEntradaActualizada,
  onReorderOutputs,
}: StreamInputCardProps) {
  // Manejo del estado de collapses en localStorage
  const {
    videoExpanded,
    setVideoExpanded,
    datosExpanded,
    setDatosExpanded,
    outputsExpanded,
    setOutputsExpanded,
    customOutputsExpanded,
    setCustomOutputsExpanded,
  } = useCollapseState(entrada.id);

  // Separar salidas por defecto y personalizadas
  const salidasPorDefecto = entrada.salidas.filter(salida => 
    ['SRT Pull', 'RTMP Pull', 'HLS'].includes(salida.nombre)
  );
  const salidasPersonalizadas = entrada.salidas.filter(salida => 
    !['SRT Pull', 'RTMP Pull', 'HLS'].includes(salida.nombre)
  );

  // Función para ordenar outputs por defecto en orden fijo: SRT Pull, RTMP Pull, HLS
  const ordenarOutputsPorDefecto = (outputs: SalidaStream[]) => {
    const ordenDeseado = ['SRT Pull', 'RTMP Pull', 'HLS'];
    return outputs.sort((a, b) => {
      const indexA = ordenDeseado.indexOf(a.nombre);
      const indexB = ordenDeseado.indexOf(b.nombre);
      return indexA - indexB;
    });
  };

  // Aplicar orden fijo a los outputs por defecto
  const salidasPorDefectoOrdenadas = ordenarOutputsPorDefecto([...salidasPorDefecto]);

  const { copyToClipboard } = useCopyToClipboard();

  const copiarAlPortapapeles = (texto: string, label?: string) => {
    copyToClipboard(texto, label);
  };

  // Cálculo simple de estadísticas sin useMemo
  const calcularEstadisticasEntrada = () => {
    // Si no hay stats o la entrada no está activa con streamId, devolver 0
    if (!stats || !entrada.streamId || !entrada.activa) {
      return { total: 0, hls: 0, srt: 0, rtmp: 0 };
    }
    
    // Usar las estadísticas globales directamente
    return {
      total: stats.total || 0,
      hls: stats.hls || 0,
      srt: stats.srt || 0,
      rtmp: stats.rtmp || 0
    };
  };

  const entradaStats = calcularEstadisticasEntrada();
  
  // Log simple para debug solo cuando hay stats
  if (stats) {
    console.log(`📊 StreamInputCard ${entrada.nombre} - Stats:`, entradaStats);
  }

  const obtenerStreamIdLimpio = (streamId: string) => {
    // Para el nuevo formato simple: publish:HASH -> extraer solo HASH
    if (streamId.startsWith('publish:')) {
      return streamId.replace('publish:', '');
    }
    // Fallback para el formato antiguo (#!::r=HASH,m=publish) si existe
    return streamId.replace('#!::r=', '').replace(',m=publish', '');
  };

  // Función de debug temporal
  const mostrarDebugInfo = () => {
    console.log('=== DEBUG INFO ===');
    console.log('Entrada completa:', entrada);
    console.log('URL de conexión:', obtenerUrlConexion());
    console.log('URL de video:', obtenerUrlHLS());
    console.log('==================');
  };

  const obtenerUrlConexion = () => {
    // Para SRT, construir la URL completa con todos los parámetros SIN codificación
    if (entrada.protocolo === ProtocoloStream.SRT) {
      const baseUrl = `srt://localhost:${entrada.puertoSRT}`;
      const params: string[] = [];
      
      // El streamId ya viene con formato "publish:HASH" desde el backend
      if (entrada.streamId) {
        params.push(`streamid=${entrada.streamId}`);
      }
      
      // Agregar passphrase si existe
      if (entrada.passphraseSRT) {
        params.push(`passphrase=${entrada.passphraseSRT}`);
      }
      
      // Agregar latencia si existe
      if (entrada.latenciaSRT) {
        params.push(`latency=${entrada.latenciaSRT}`);
      }
      
      // Construir URL final sin codificación
      const finalUrl = params.length > 0 ? `${baseUrl}?${params.join('&')}` : baseUrl;
      return finalUrl;
    }
    
    // La URL se genera automáticamente en el backend para RTMP
    return entrada.url;
  };

  const obtenerUrlHLS = () => {
    // La fuente de verdad es la URL de la salida 'HLS' generada por el backend.
    const hlsSalida = entrada.salidas.find(
      (s) => s.protocolo === 'HLS' || s.nombre === 'HLS'
    );

    if (hlsSalida && hlsSalida.urlDestino) {
      // Usar la URL completa del backend para evitar problemas de CORS o rutas relativas.
      return hlsSalida.urlDestino;
    }

    console.warn('No se encontró una salida HLS con urlDestino en la entrada:', entrada);
    
    // Fallback: construir URL HLS basada en el protocolo de entrada
    if (entrada.protocolo === ProtocoloStream.SRT && entrada.streamId) {
      // SRT usa path directo sin "live/"
      const streamPath = entrada.streamId.replace('publish:', '');
      return `http://localhost:8888/${streamPath}/index.m3u8`;
    } else if (entrada.protocolo === ProtocoloStream.RTMP && entrada.streamKey) {
      // RTMP usa "live/{streamKey}"
      return `http://localhost:8888/live/${entrada.streamKey}/index.m3u8`;
    }
    
    return null;
  };

  const hlsUrl = obtenerUrlHLS();
  const isActive = entrada.activa; // Usar el estado dinámico de la BD

  return (
    <Card className={`w-full max-w-md relative py-6 ${isDragging ? 'shadow-lg' : ''}`}>
      {/* Handle para arrastrar */}
      <div 
        {...dragListeners}
        className="absolute top-0 left-0 right-0 h-7 w-full flex items-center justify-center cursor-grab bg-transparent hover:bg-muted/50 transition-colors rounded-t-lg"
      >
        <div className="flex gap-1 text-muted-foreground">
          <Minus className="h-4 w-4" />
          <Minus className="h-4 w-4" />
          <Minus className="h-4 w-4" />
        </div>
      </div>

      <CardHeader>
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full border-2 ${isActive ? 'bg-green-500 border-green-400 shadow-green-500/50 shadow-lg' : 'bg-gray-400 border-gray-300'}`} />
            <CardTitle className="text-lg">{entrada.nombre}</CardTitle>
            <Badge 
              variant={entrada.protocolo === ProtocoloStream.RTMP ? 'default' : 'secondary'}
              className="text-xs px-2 py-1"
            >
              {entrada.protocolo}
            </Badge>
            {entradaStats.total > 0 && (
              <Badge variant="outline" className="text-xs px-2 py-1 bg-green-50 text-green-700 border-green-200">
                {entradaStats.total} conectado{entradaStats.total !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <EditEntradaModal 
              entrada={entrada} 
              onEntradaActualizada={onEntradaActualizada}
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit className="h-4 w-4" />
                </Button>
              }
            />
            <DeleteConfirmDialog
              title="Eliminar Entrada"
              description={`¿Estás seguro de que quieres eliminar la entrada "${entrada.nombre}"? Esta acción eliminará también todas las salidas asociadas y no se puede deshacer.`}
              onConfirm={async () => onEliminar(entrada.id)}
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Sección de Video */}
        <StreamVideoSection
          isExpanded={videoExpanded}
          onToggle={setVideoExpanded}
          hlsUrl={hlsUrl}
          isActive={isActive}
        />

        {/* Sección de Datos de Conexión */}
        <StreamConnectionData
          isExpanded={datosExpanded}
          onToggle={setDatosExpanded}
          entrada={entrada}
          connectionUrl={obtenerUrlConexion()}
          onCopyToClipboard={copiarAlPortapapeles}
          getCleanStreamId={obtenerStreamIdLimpio}
        />

        {/* Outputs por Defecto */}
        <StreamOutputsSection
          isExpanded={outputsExpanded}
          onToggle={setOutputsExpanded}
          outputs={salidasPorDefectoOrdenadas}
          title="Outputs por Defecto"
          icon={<Radio className="h-4 w-4" />}
          entradaId={entrada.id}
          onActualizarSalida={onActualizarSalida}
          onEntradaActualizada={onEntradaActualizada}
          showCreateButton={false}
          isDefaultOutputs={true}
          deviceStats={entradaStats}
        />

        {/* Outputs Personalizados */}
        <StreamOutputsSection
          isExpanded={customOutputsExpanded}
          onToggle={setCustomOutputsExpanded}
          outputs={salidasPersonalizadas}
          title="Outputs Personalizados"
          icon={<Settings2 className="h-4 w-4" />}
          entradaId={entrada.id}
          onActualizarSalida={onActualizarSalida}
          onDeleteOutput={onEliminarSalida}
          onEntradaActualizada={onEntradaActualizada}
          onReorderOutputs={onReorderOutputs}
          showCreateButton={true}
          isDefaultOutputs={false}
        />
      </CardContent>
    </Card>
  );
} 