"use client";

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronUp,
  Play,
  Copy,
  Plus,
  Trash2,
  Settings,
  Edit
} from 'lucide-react';
import { EntradaStream, ProtocoloStream, ProtocoloSalida } from '@/types/streaming';
import { EditEntradaModal } from './edit-entrada-modal';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { CreateSalidaModal } from './create-salida-modal';
import { EditSalidaModal } from './edit-salida-modal';
import { DeleteSalidaConfirm } from './delete-salida-confirm';
import { OutputSwitchConfirm } from './output-switch-confirm';
import { HLSPlayer } from './hls-player';

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
  const [videoExpanded, setVideoExpanded] = useState(false);
  const [datosExpanded, setDatosExpanded] = useState(false);
  const [outputsExpanded, setOutputsExpanded] = useState(false);
  const [customOutputsExpanded, setCustomOutputsExpanded] = useState(false);

  // Separar salidas por defecto y personalizadas
  const salidasPorDefecto = entrada.salidas.filter(salida => 
    ['SRT Pull', 'RTMP Pull', 'HLS'].includes(salida.nombre)
  );
  const salidasPersonalizadas = entrada.salidas.filter(salida => 
    !['SRT Pull', 'RTMP Pull', 'HLS'].includes(salida.nombre)
  );

  const copiarAlPortapapeles = (texto: string) => {
    navigator.clipboard.writeText(texto);
  };

  const obtenerStreamIdLimpio = (streamId: string) => {
    // Extraer solo el hash del streamId de MediaMTX (#!::r=HASH,m=publish)
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
    // Para SRT, mostrar solo la URL base sin streamid
    if (entrada.protocolo === ProtocoloStream.SRT) {
      return `srt://localhost:${entrada.puertoSRT}`;
    }
    // La URL se genera automáticamente en el backend
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
          <CardTitle className="text-lg">{entrada.nombre}</CardTitle>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${entrada.activo ? 'bg-green-500' : 'bg-gray-400'}`} />
            <Badge variant={entrada.protocolo === ProtocoloStream.RTMP ? 'default' : 'secondary'}>
              {entrada.protocolo}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-blue-500"
              onClick={mostrarDebugInfo}
              title="Debug Info"
            >
              🐛
            </Button>
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
        {/* Componente Video */}
        <Collapsible open={videoExpanded} onOpenChange={setVideoExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-2 h-auto">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                <span className="font-medium">Video</span>
              </div>
              {videoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2">
            {obtenerUrlHLS() && entrada.activo ? (
              <HLSPlayer 
                src={obtenerUrlHLS()!}
                autoPlay={false}
                muted={true}
              />
            ) : (
              <div className="bg-black rounded-md aspect-video flex items-center justify-center">
                <div className="text-gray-400 text-sm text-center">
                  {entrada.activo ? (
                    <div>
                      <p>⏳ Procesando video...</p>
                      <p className="text-xs mt-1">El stream está activo, el video aparecerá automáticamente</p>
                    </div>
                  ) : (
                    <div>
                      <p>📡 Sin señal</p>
                      <p className="text-xs mt-1">Inicia tu stream para ver el video aquí</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Componente Datos */}
        <Collapsible open={datosExpanded} onOpenChange={setDatosExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-2 h-auto">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="font-medium">Datos de Conexión</span>
              </div>
              {datosExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">URL:</span>
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {obtenerUrlConexion()}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => copiarAlPortapapeles(obtenerUrlConexion())}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {entrada.protocolo === ProtocoloStream.RTMP && entrada.streamKey && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stream Key:</span>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {entrada.streamKey}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => copiarAlPortapapeles(entrada.streamKey!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {entrada.protocolo === ProtocoloStream.SRT && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Puerto:</span>
                    <span className="text-sm">{entrada.puertoSRT}</span>
                  </div>
                  {entrada.streamId && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Stream ID:</span>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          publish:{obtenerStreamIdLimpio(entrada.streamId)}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => copiarAlPortapapeles(`publish:${obtenerStreamIdLimpio(entrada.streamId!)}`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {entrada.passphraseSRT && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Passphrase:</span>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {entrada.passphraseSRT}
                      </code>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Latencia:</span>
                    <span className="text-sm">{entrada.latenciaSRT || 200}ms</span>
                  </div>
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Outputs por Defecto */}
        <Collapsible open={outputsExpanded} onOpenChange={setOutputsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-2 h-auto">
              <div className="flex items-center gap-2">
                <span className="font-medium">Outputs por Defecto</span>
                <Badge variant="outline">{salidasPorDefecto.length}</Badge>
              </div>
              {outputsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2">
            {salidasPorDefecto.map((salida) => (
              <div key={salida.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {salida.protocolo}
                  </Badge>
                  <span className="text-sm">{salida.nombre}</span>
                </div>
                <OutputSwitchConfirm
                  isEnabled={salida.habilitada}
                  outputName={salida.nombre}
                  onConfirm={(enabled) => onActualizarSalida(salida.id, enabled)}
                />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Custom Outputs */}
        <Collapsible open={customOutputsExpanded} onOpenChange={setCustomOutputsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-2 h-auto">
              <div className="flex items-center gap-2">
                <span className="font-medium">Outputs Personalizados</span>
                <Badge variant="outline">{salidasPersonalizadas.length}</Badge>
              </div>
              {customOutputsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2">
            {salidasPersonalizadas.map((salida) => (
              <div key={salida.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {salida.protocolo}
                  </Badge>
                  <span className="text-sm">{salida.nombre}</span>
                </div>
                <div className="flex items-center gap-1">
                  <OutputSwitchConfirm
                    isEnabled={salida.habilitada}
                    outputName={salida.nombre}
                    onConfirm={(enabled) => onActualizarSalida(salida.id, enabled)}
                  />
                  <EditSalidaModal
                    salida={salida}
                    onSalidaActualizada={onEntradaActualizada}
                  />
                  <DeleteSalidaConfirm
                    salida={salida}
                    onSalidaEliminada={onEntradaActualizada}
                  />
                </div>
              </div>
            ))}
            <CreateSalidaModal 
              entradaId={entrada.id}
              onSalidaCreada={onEntradaActualizada}
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
} 