'use client';

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
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string;
  children: (
    listeners: DraggableSyntheticListeners,
    isDragging: boolean
  ) => React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.7 : 1,
  };
  
  const combinedListeners = {
    ...attributes,
    ...listeners,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children(combinedListeners, isDragging)}
    </div>
  );
}

interface SortableGridProps<T extends { id: string }> {
  items: T[];
  onReorder: (reorderedItems: T[]) => void;
  children: (
    item: T,
    listeners: DraggableSyntheticListeners,
    isDragging: boolean
  ) => React.ReactNode;
  className?: string;
}

export function SortableGrid<T extends { id: string }>({
  items,
  onReorder,
  children,
  className,
}: SortableGridProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      onReorder(reorderedItems);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className={className}>
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id}>
              {(listeners, isDragging) => children(item, listeners, isDragging)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
} 