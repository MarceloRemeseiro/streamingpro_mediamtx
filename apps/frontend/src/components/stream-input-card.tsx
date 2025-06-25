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
  Edit
} from 'lucide-react';
import { EntradaStream, ProtocoloStream } from '@/types/streaming';
import { EditEntradaModal } from './edit-entrada-modal';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { useCollapseState } from '@/lib/hooks';
import { StreamVideoSection } from './stream-video-section';
import { StreamConnectionData } from './stream-connection-data';
import { StreamOutputsSection } from './stream-outputs-section';
import { useCopyToClipboard } from '@/lib/use-copy-to-clipboard';

interface StreamInputCardProps {
  entrada: EntradaStream;
  onEliminar: (id: string) => void;
  onActualizarSalida: (salidaId: string, habilitada: boolean) => void;
  onEntradaActualizada: () => void;
}

export function StreamInputCard({ 
  entrada, 
  onEliminar, 
  onActualizarSalida, 
  onEntradaActualizada
}: StreamInputCardProps) {
  // Estado de collapses persistente en localStorage
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

  const { copyToClipboard } = useCopyToClipboard();

  const copiarAlPortapapeles = (texto: string, label?: string) => {
    copyToClipboard(texto, label);
  };

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
    console.log('Estado activo:', entrada.activo);
    console.log('URL del backend:', entrada.hlsUrl);
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
    // Usar hlsUrl del backend si está disponible (ya incluye la configuración correcta)
    if (entrada.hlsUrl) {
      return entrada.hlsUrl;
    }
    
    // Fallback: generar URL HLS según el protocolo de entrada
    if (entrada.protocolo === ProtocoloStream.RTMP && entrada.streamKey) {
      const fallbackUrl = `live/${entrada.streamKey}`;
      return fallbackUrl;
    } else if (entrada.protocolo === ProtocoloStream.SRT && entrada.streamId) {
      // Extraer el path del streamId (formato: publish:path)
      const streamPath = entrada.streamId.replace('publish:', '');
      return streamPath;
    }
    
    return null;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full border-2 ${entrada.activo ?? false ? 'bg-green-500 border-green-400 shadow-green-500/50 shadow-lg' : 'bg-gray-400 border-gray-300'}`} />
                          <CardTitle className="text-lg">{entrada.nombre}</CardTitle>
                          <Badge 
                variant={entrada.protocolo === ProtocoloStream.RTMP ? 'default' : 'secondary'}
                className="text-xs px-2 py-1"
              >
              {entrada.protocolo}
            </Badge>
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
          hlsUrl={obtenerUrlHLS()}
          isActive={entrada.activo ?? false}
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
          outputs={salidasPorDefecto}
          title="Outputs por Defecto"
          icon={<Radio className="h-4 w-4" />}
          entradaId={entrada.id}
          onActualizarSalida={onActualizarSalida}
          onEntradaActualizada={onEntradaActualizada}
          showCreateButton={false}
          isDefaultOutputs={true}
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
          onEntradaActualizada={onEntradaActualizada}
          showCreateButton={true}
          isDefaultOutputs={false}
        />
      </CardContent>
    </Card>
  );
} 