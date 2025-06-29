"use client";

import React, { useState } from 'react';
import { 
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DraggableSyntheticListeners } from '@dnd-kit/core';
import { SalidaStream, ProtocoloSalida } from '@/types/streaming';
import { GripVertical, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useCopyToClipboard } from '@/lib/use-copy-to-clipboard';
import { useOutputStatus } from '@/lib/use-output-status';
import { esOutputPersonalizado } from '@/lib/utils';
import { OutputStatusIndicator } from './output-status-indicator';
import { OutputSwitchConfirm } from './output-switch-confirm';
import { EditSalidaModal } from './edit-salida-modal';
import { DeleteSalidaConfirm } from './delete-salida-confirm';

interface CustomOutputCardProps {
  salida: SalidaStream;
  listeners: DraggableSyntheticListeners;
  onUpdate: () => void;
  onToggle: (id: string, activa: boolean) => void;
  onDelete: (id: string) => void;
}

const DetailRow = ({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) => (
  <div className="flex items-center justify-between text-sm py-1 px-1 rounded-md hover:bg-muted/50">
    <span className="font-medium text-muted-foreground text-xs">{label}</span>
    <div className="flex items-center gap-1">
      <span className="font-mono text-xs bg-muted/80 px-1.5 py-0.5 rounded max-w-[180px] truncate">{value}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCopy}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  </div>
);

export function CustomOutputCard({
  salida,
  listeners,
  onUpdate,
  onToggle,
  onDelete,
}: CustomOutputCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { copyToClipboard } = useCopyToClipboard();
  
  // Verificar si es output personalizado
  const esPersonalizado = esOutputPersonalizado(salida);
  
  // Hook para manejar el estado del output (solo para personalizados)
  const { estado } = useOutputStatus({
    outputId: salida.id,
    initialEstado: salida.estado,
    enabled: esPersonalizado, // Solo habilitar para outputs personalizados
  });

  // 🔍 LOG TEMPORAL PARA DEBUG
  console.log('🔍 CustomOutputCard - Datos de salida:', {
    id: salida.id,
    nombre: salida.nombre,
    protocolo: salida.protocolo,
    streamKey: salida.streamKey,
    streamId: salida.streamId,
    urlDestino: salida.urlDestino,
    puertoSRT: salida.puertoSRT,
    passphraseSRT: salida.passphraseSRT
  });

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center p-1.5 ">
          <div {...listeners} className="cursor-grab p-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 shrink-0">
            {salida.protocolo}
          </Badge>

          <span className="font-medium text-sm ml-2 flex-1 truncate">{salida.nombre}</span>

          <div className="flex items-center gap-0.5 shrink-0 ml-2">
            {/* Indicador de estado para outputs personalizados */}
            <OutputStatusIndicator 
              estado={estado || salida.estado} 
              esOutputPersonalizado={esPersonalizado}
              habilitada={salida.habilitada}
              className="mr-1" 
            />
            
            <OutputSwitchConfirm
              isEnabled={salida.habilitada}
              outputName={salida.nombre}
              onConfirm={(enabled) => onToggle(salida.id, enabled)}
            />
            <EditSalidaModal
              salida={salida}
              onSalidaActualizada={onUpdate}
            />
            <DeleteSalidaConfirm
              salida={salida}
              onSalidaEliminada={() => onDelete(salida.id)}
            />
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent asChild>
          <CardContent className="p-2 space-y-1 bg-muted/20">
            {salida.protocolo === ProtocoloSalida.RTMP && (
              <>
                <DetailRow 
                  label="URL Servidor"
                  value={salida.urlDestino}
                  onCopy={() => copyToClipboard(salida.urlDestino, 'URL de Servidor')}
                />
                {salida.claveStreamRTMP && (
                  <DetailRow 
                    label="Clave de Stream"
                    value={salida.claveStreamRTMP}
                    onCopy={() => copyToClipboard(salida.claveStreamRTMP!, 'Clave de Stream')}
                  />
                )}
              </>
            )}
            {salida.protocolo === ProtocoloSalida.SRT && (
              <>
                <DetailRow 
                  label="URL Destino"
                  value={salida.urlDestino}
                  onCopy={() => copyToClipboard(salida.urlDestino, 'URL de Destino')}
                />
                {salida.puertoSRT && (
                  <DetailRow 
                    label="Puerto"
                    value={salida.puertoSRT.toString()}
                    onCopy={() => copyToClipboard(salida.puertoSRT!.toString(), 'Puerto SRT')}
                  />
                )}
                {salida.streamId && (
                  <DetailRow 
                    label="StreamID"
                    value={salida.streamId}
                    onCopy={() => copyToClipboard(salida.streamId!, 'StreamID')}
                  />
                )}
                {salida.passphraseSRT && (
                  <DetailRow 
                    label="Passphrase"
                    value="********" // Ocultar por seguridad
                    onCopy={() => copyToClipboard(salida.passphraseSRT!, 'Passphrase')}
                  />
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
} 