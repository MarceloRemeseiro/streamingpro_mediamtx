"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { SalidaStream } from '@/types/streaming';
import { OutputSwitchConfirm } from './output-switch-confirm';
import { EditSalidaModal } from './edit-salida-modal';
import { DeleteSalidaConfirm } from './delete-salida-confirm';
import { CreateSalidaModal } from './create-salida-modal';
import { useCopyToClipboard } from '@/lib/use-copy-to-clipboard';

interface StreamOutputsSectionProps {
  isExpanded: boolean;
  onToggle: (expanded: boolean) => void;
  outputs: SalidaStream[];
  title: string;
  icon: React.ReactNode;
  entradaId: string;
  onActualizarSalida: (salidaId: string, habilitada: boolean) => void;
  onEntradaActualizada: () => void;
  showCreateButton?: boolean;
  isDefaultOutputs?: boolean;
}

export function StreamOutputsSection({ 
  isExpanded, 
  onToggle, 
  outputs, 
  title,
  icon,
  entradaId,
  onActualizarSalida,
  onEntradaActualizada,
  showCreateButton = false,
  isDefaultOutputs = false
}: StreamOutputsSectionProps) {
  const { copyToClipboard } = useCopyToClipboard();

  const copiarAlPortapapeles = (texto: string, salida: SalidaStream) => {
    const label = `URL de ${salida.nombre}`;
    copyToClipboard(texto, label);
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-2 h-auto">
          <div className="flex items-center gap-3">
            {icon}
            <span className="font-medium text-sm">{title}</span>
            <Badge variant="outline" className="text-xs px-2 py-1">
              {outputs.length}
            </Badge>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 px-2">
        <div className="space-y-2">
          {outputs.map((salida) => (
            <div key={salida.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Badge variant="secondary" className="text-xs px-2 py-1 shrink-0">
                  {salida.protocolo}
                </Badge>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium block truncate">{salida.nombre}</span>
                  {salida.urlDestino && (
                    <span className="text-xs text-muted-foreground block truncate">
                      {salida.urlDestino}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isDefaultOutputs ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copiarAlPortapapeles(salida.urlDestino || '', salida)}
                    title="Copiar URL"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          ))}
          
          {showCreateButton && (
            <div className="mt-3">
              <CreateSalidaModal 
                entradaId={entradaId}
                onSalidaCreada={onEntradaActualizada}
              />
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
} 