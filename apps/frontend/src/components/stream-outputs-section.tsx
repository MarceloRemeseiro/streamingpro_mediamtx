"use client";

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DraggableSyntheticListeners,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

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
import { SortableGrid } from './sortable-grid';
import { Switch } from '@/components/ui/switch';
import { CustomOutputCard } from './custom-output-card';

interface StreamOutputsSectionProps {
  isExpanded: boolean;
  onToggle: (expanded: boolean) => void;
  outputs: SalidaStream[];
  title: string;
  icon: React.ReactNode;
  entradaId: string;
  onActualizarSalida: (salidaId: string, habilitada: boolean) => void;
  onEntradaActualizada: () => void;
  onReorderOutputs?: (reorderedOutputs: SalidaStream[]) => void;
  showCreateButton?: boolean;
  isDefaultOutputs?: boolean;
  onDeleteOutput?: (id: string) => void;
  isUpdating?: boolean;
  deviceStats?: { total: number; hls: number; srt: number; rtmp: number };
}

interface SortableOutputItemProps {
  salida: SalidaStream;
  onUpdate: () => void;
  onToggle: (id: string, activa: boolean) => void;
  onDelete: (id: string) => void;
  listeners: DraggableSyntheticListeners;
}

function SortableOutputItem({
  salida,
  onUpdate,
  onToggle,
  onDelete,
  listeners
}: SortableOutputItemProps) {
  const {
    attributes,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: salida.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <CustomOutputCard 
        salida={salida}
        listeners={listeners}
        onUpdate={onUpdate}
        onToggle={onToggle}
        onDelete={onDelete}
      />
    </div>
  );
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
  onReorderOutputs,
  showCreateButton = false,
  isDefaultOutputs = false,
  onDeleteOutput,
  isUpdating,
  deviceStats,
}: StreamOutputsSectionProps) {
  const { copyToClipboard } = useCopyToClipboard();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const copiarAlPortapapeles = (texto: string, salida: SalidaStream) => {
    const label = `URL de ${salida.nombre}`;
    copyToClipboard(texto, label);
  };

  // Obtener contador de dispositivos para un protocolo específico
  const getDeviceCount = (protocolo: string) => {
    if (!deviceStats || !isDefaultOutputs) return 0;
    
    const count = (() => {
      switch (protocolo.toLowerCase()) {
        case 'hls':
          return deviceStats.hls || 0;
        case 'srt':
        case 'srt pull':
          return deviceStats.srt || 0;
        case 'rtmp':
        case 'rtmp pull':
          return deviceStats.rtmp || 0;
        default:
          return 0;
      }
    })();
    
    // Debug simple
    console.log(`📊 getDeviceCount ${protocolo}: ${count} (deviceStats:`, deviceStats, ')');
    return count;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = outputs.findIndex((o) => o.id === active.id);
      const newIndex = outputs.findIndex((o) => o.id === over.id);
      
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(outputs, oldIndex, newIndex);
      onReorderOutputs?.(reordered);
    }
  };

  // Renderizado compacto para outputs por defecto en una sola línea
  const renderDefaultOutputsCompact = () => (
    <div className="flex gap-2 flex-wrap">
      {outputs.map((salida) => {
        const deviceCount = getDeviceCount(salida.nombre);
        
        return (
          <div key={salida.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg flex-1 min-w-0">
            <Badge variant="secondary" className="text-xs px-2 py-1 shrink-0">
              {salida.protocolo}
            </Badge>
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
              {deviceCount}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => copiarAlPortapapeles(salida.urlDestino || '', salida)}
              title="Copiar URL"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );

  const renderOutputItem = (salida: SalidaStream) => {
    const deviceCount = getDeviceCount(salida.nombre);
    
    return (
      <div key={salida.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Badge variant="secondary" className="text-xs px-2 py-1 shrink-0">
            {salida.protocolo}
          </Badge>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium block truncate">{salida.nombre}</span>
              {isDefaultOutputs && deviceCount > 0 && (
                <Badge variant="outline" className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200">
                  {deviceCount}
                </Badge>
              )}
            </div>
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
    );
  };
  
  const sortableItems = outputs.map(o => o.id);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-2 h-10">
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
      <CollapsibleContent className="space-y-2 px-2 pt-2">
        {isDefaultOutputs ? (
          // Renderizado compacto para outputs por defecto
          renderDefaultOutputsCompact()
        ) : onReorderOutputs ? (
          // Renderizado con drag & drop para outputs personalizados
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                <SortableGrid
                  items={outputs}
                  onReorder={onReorderOutputs}
                  className="flex flex-col gap-2"
                >
                  {(salida, listeners) => (
                    <SortableOutputItem
                      key={salida.id}
                      salida={salida}
                      onToggle={onActualizarSalida}
                      onUpdate={onEntradaActualizada}
                      onDelete={onDeleteOutput!}
                      listeners={listeners}
                    />
                  )}
                </SortableGrid>
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          // Renderizado normal sin drag & drop
          <div className="space-y-2">
            {outputs.map((salida) => renderOutputItem(salida))}
          </div>
        )}
        
        {showCreateButton && (
          <div className="mt-3">
            <CreateSalidaModal 
              entradaId={entradaId}
              onSalidaCreada={onEntradaActualizada}
            />
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
} 