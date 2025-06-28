"use client";

import React, { memo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
}

interface SortableOutputItemProps {
  salida: SalidaStream;
  onUpdate: () => void;
  onToggle: (id: string, activa: boolean) => void;
}

function SortableOutputItem({
  salida,
  onUpdate,
  onToggle,
}: SortableOutputItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: salida.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 pl-0 bg-muted rounded-lg touch-none"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div {...attributes} {...listeners} className="cursor-grab p-2">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
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
          onSalidaEliminada={onUpdate}
        />
      </div>
    </div>
  );
}

const StreamOutputsSection = memo(function StreamOutputsSection({ 
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

  const renderOutputItem = (salida: SalidaStream) => (
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
  );
  
  const sortableItems = outputs.map(o => o.id);

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
        {!isDefaultOutputs && onReorderOutputs ? (
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
                  {(salida) => (
                    <SortableOutputItem
                      key={salida.id}
                      salida={salida}
                      onToggle={onActualizarSalida}
                      onUpdate={onEntradaActualizada}
                    />
                  )}
                </SortableGrid>
              </div>
            </SortableContext>
          </DndContext>
        ) : (
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
}, (prevProps, nextProps) => {
  // Solo re-renderizar si hay cambios en las salidas o estado de expansión
  return (
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.outputs.length === nextProps.outputs.length &&
    JSON.stringify(prevProps.outputs.map(o => ({ id: o.id, habilitada: o.habilitada, nombre: o.nombre }))) ===
    JSON.stringify(nextProps.outputs.map(o => ({ id: o.id, habilitada: o.habilitada, nombre: o.nombre })))
  );
});

export { StreamOutputsSection }; 