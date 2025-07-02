"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StreamInputCard } from '@/components/stream-input-card';
import { CreateEntradaModal } from '@/components/create-entrada-modal';
import { EntradaStream, SalidaStream } from '@/types/streaming';
import { entradasApi, salidasApi } from '@/lib/api';
import { useSocket } from '@/components/socket-provider';
import { SortableGrid } from '@/components/sortable-grid';
import { useDeviceStats } from '@/lib/hooks';
import toast from 'react-hot-toast';

export default function EntradasPage() {
  const socket = useSocket();
  const { stats: deviceStats } = useDeviceStats();
  const [entradas, setEntradas] = useState<EntradaStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug simple para stats
  console.log('📊 EntradasPage - deviceStats:', deviceStats);

  const fetchEntradas = useCallback(async () => {
    try {
      const data = await entradasApi.obtenerTodas();
      
      // 🔍 LOG TEMPORAL PARA DEBUG
      console.log('🔍 fetchEntradas - Datos recibidos de la API:', data);
      data.forEach((entrada, index) => {
        console.log(`🔍 Entrada ${index + 1} (${entrada.nombre}):`, {
          id: entrada.id,
          protocolo: entrada.protocolo,
          streamKey: entrada.streamKey,
          streamId: entrada.streamId,
          salidas: entrada.salidas?.map(s => ({
            id: s.id,
            nombre: s.nombre,
            protocolo: s.protocolo,
            streamKey: s.streamKey,
            streamId: s.streamId,
            urlDestino: s.urlDestino
          }))
        });
      });
      
      setEntradas(data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar entradas:', err);
      setError('Error al cargar las entradas de streaming');
      toast.error('No se pudieron cargar las entradas.');
    } finally {
      if (loading) setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchEntradas();
  }, [fetchEntradas]);

  useEffect(() => {
    if (socket) {
      const handleUpdate = () => {
        console.log('📡 Evento WebSocket recibido, recargando entradas...');
        fetchEntradas();
      };

      socket.on('stream-update', handleUpdate);
      socket.on('output-update', handleUpdate);
      socket.on('entrada-update', handleUpdate);
      socket.on('estado-actualizado', handleUpdate);
      socket.on('output-status-change', handleUpdate);

      return () => {
        socket.off('stream-update', handleUpdate);
        socket.off('output-update', handleUpdate);
        socket.off('entrada-update', handleUpdate);
        socket.off('estado-actualizado', handleUpdate);
        socket.off('output-status-change', handleUpdate);
      };
    }
  }, [socket, fetchEntradas]);

  const handleReorderEntradas = async (reorderedEntradas: EntradaStream[]) => {
    setEntradas(reorderedEntradas);
    try {
      const ids = reorderedEntradas.map(e => e.id);
      await entradasApi.reordenar(ids);
      toast.success("Orden de las entradas actualizado.");
    } catch (err) {
      console.error("Error al reordenar entradas:", err);
      toast.error("No se pudo guardar el nuevo orden.");
      fetchEntradas();
    }
  };

  const handleEliminarEntrada = async (id: string) => {
    try {
      await entradasApi.eliminar(id);
      toast.success('Entrada eliminada.');
      setEntradas(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error eliminando la entrada:', err);
      toast.error('No se pudo eliminar la entrada.');
    }
  };

  const handleEliminarSalida = async (salidaId: string) => {
    try {
      await salidasApi.eliminar(salidaId);
      toast.success('Salida eliminada correctamente.');
      // Actualizar el estado local para reflejar la eliminación
      setEntradas(prevEntradas => 
        prevEntradas.map(entrada => ({
          ...entrada,
          salidas: entrada.salidas.filter(s => s.id !== salidaId)
        }))
      );
    } catch (err) {
      console.error('Error eliminando la salida:', err);
      toast.error('No se pudo eliminar la salida.');
    }
  };

  const handleActualizarSalida = async (salidaId: string, activa: boolean) => {
    try {
      await salidasApi.actualizar(salidaId, { habilitada: activa });
      toast.success(`Salida ${activa ? 'activada' : 'desactivada'}.`);
      fetchEntradas();
    } catch (err) {
      console.error('Error actualizando la salida:', err);
      toast.error('No se pudo actualizar el estado de la salida.');
    }
  };

  const handleReorderOutputs = async (entradaId: string, reorderedOutputs: SalidaStream[]) => {
    setEntradas(prev =>
      prev.map(e => {
        if (e.id === entradaId) {
          const defaultOutputs = e.salidas.filter(s => !reorderedOutputs.find(rs => rs.id === s.id));
          return { ...e, salidas: [...defaultOutputs, ...reorderedOutputs] };
        }
        return e;
      })
    );
    try {
      const ids = reorderedOutputs.map(s => s.id);
      await salidasApi.reordenar(ids);
      toast.success('Orden de las salidas actualizado.');
    } catch (err) {
      console.error("Error al reordenar salidas:", err);
      toast.error('No se pudo guardar el nuevo orden de las salidas.');
      fetchEntradas();
    }
  };

  if (loading) {
    return <p className="p-8">Cargando streams...</p>;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => { setLoading(true); fetchEntradas(); }}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Entradas de Stream</h1>
        <CreateEntradaModal 
          onEntradaCreada={fetchEntradas}
          trigger={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Entrada
            </Button>
          }
        />
      </div>

      {entradas.length === 0 ? (
        <div className="text-center py-10">
          <p>No hay entradas de stream configuradas.</p>
        </div>
      ) : (
        <SortableGrid
          items={entradas}
          onReorder={handleReorderEntradas}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
        >
          {(entrada, listeners, isDragging) => (
            <StreamInputCard
              key={entrada.id}
              entrada={entrada}
              stats={deviceStats}
              dragListeners={listeners}
              isDragging={isDragging}
              onEliminar={handleEliminarEntrada}
              onEliminarSalida={handleEliminarSalida}
              onActualizarSalida={handleActualizarSalida}
              onEntradaActualizada={fetchEntradas}
              onReorderOutputs={(reorderedOutputs) => handleReorderOutputs(entrada.id, reorderedOutputs)}
            />
          )}
        </SortableGrid>
      )}
    </div>
  );
} 