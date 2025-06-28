"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { StreamInputCard } from '@/components/stream-input-card';
import { CreateEntradaModal } from '@/components/create-entrada-modal';
import { MediaMTXStatus } from '@/components/mediamtx-status';
import { EntradaStream } from '@/types/streaming';
import { entradasApi, salidasApi } from '@/lib/api';
import { useSocket } from '@/components/socket-provider';

// Tipos para WebSocket events
interface EstadoConexionEvent {
  entradaId: string;
  activa: boolean;
  pathInfo?: any;
  timestamp: string;
}

interface CambioOutputEvent {
  entradaId: string;
  outputId: string;
  accion: 'creado' | 'actualizado' | 'eliminado';
  timestamp: string;
}

export default function Home() {
  const [entradas, setEntradas] = useState<EntradaStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket para actualizaciones en tiempo real
  const socket = useSocket();

  // Cargar entradas iniciales
  const cargarEntradas = useCallback(async () => {
    try {
      // setLoading(true); // Evitar loader en recargas para que no parpadee
      const data = await entradasApi.obtenerTodas();
      setEntradas(data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar entradas:', err);
      setError('Error al cargar las entradas de streaming');
    } finally {
      setLoading(false);
    }
  }, []);

  // Manejador de cambios en outputs con debounce
  const handleCambioOutput = useCallback(async (event: CambioOutputEvent) => {
    console.log('🔄 Cambio en output via WebSocket:', event);
    
    try {
      // En lugar de recargar todo, solo actualizar la entrada específica
      const entradaActualizada = await entradasApi.obtenerPorId(event.entradaId);
      
      setEntradas(prev => {
        const entradaExistente = prev.find(e => e.id === event.entradaId);
        if (!entradaExistente) {
          // Si la entrada no existe (caso raro), agregarla
          return [...prev, entradaActualizada];
        }

        // Comparar si hay cambios reales para evitar re-render
        if (JSON.stringify(entradaExistente.salidas) === JSON.stringify(entradaActualizada.salidas)) {
          console.log('🔄 Sin cambios reales en salidas, evitando re-render');
          return prev;
        }
        
        return prev.map(entrada => 
          entrada.id === event.entradaId 
            ? entradaActualizada
            : entrada
        );
      });
      
      console.log(`✅ Entrada ${event.entradaId} actualizada localmente`);
    } catch (error) {
      console.error('Error actualizando entrada específica:', error);
      // Si falla la actualización específica, recargar todo como fallback
      cargarEntradas();
    }
  }, [cargarEntradas]);

  useEffect(() => {
    if (!socket) return;

    // Manejador de conexión
    socket.on('connect', () => {
      console.log('🔗 WebSocket conectado en Home');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket desconectado en Home');
      setIsConnected(false);
    });

    // Manejador de estado de conexión de streams
    const handleEstadoConexion = (event: EstadoConexionEvent) => {
      console.log('🔄 Estado de conexión actualizado via WebSocket:', event);
      setEntradas(prev => 
        prev.map(entrada => 
          entrada.id === event.entradaId 
            ? { ...entrada, activa: event.activa }
            : entrada
        )
      );
    };

    socket.on('estado-conexion', handleEstadoConexion);
    socket.on('cambio-output', handleCambioOutput);

    // Limpieza de listeners
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('estado-conexion', handleEstadoConexion);
      socket.off('cambio-output', handleCambioOutput);
    };

  }, [socket, handleCambioOutput]);

  useEffect(() => {
    cargarEntradas();
  }, [cargarEntradas]);

  // Debug: Mostrar cambios en las entradas
  useEffect(() => {
    console.log('📊 Entradas actualizadas:', entradas.map(e => ({ 
      id: e.id, 
      nombre: e.nombre, 
      activa: e.activa 
    })));
  }, [entradas]);

  const manejarEliminarEntrada = async (id: string) => {
    try {
      await entradasApi.eliminar(id);
      // La actualización de estado vendrá por WebSocket si todo va bien,
      // pero por si acaso, actualizamos localmente.
      setEntradas(prev => prev.filter(entrada => entrada.id !== id));
    } catch (error) {
      console.error('Error al eliminar entrada:', error);
    }
  };

  const manejarActualizarSalida = async (salidaId: string, habilitada: boolean) => {
    try {
      await salidasApi.actualizar(salidaId, { habilitada });
      // El cambio se reflejará via 'cambio-output' y recarga de entradas.
    } catch (error) {
      console.error('Error al actualizar salida:', error);
    }
  };

  const manejarCrearEntrada = () => {
    cargarEntradas();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando entradas de streaming...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={cargarEntradas}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                StreamingPro
              </h1>
              <p className="text-sm text-muted-foreground">
                Plataforma de distribución de vídeo SRT/RTMP
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Indicador de conexión WebSocket */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              <CreateEntradaModal 
                onEntradaCreada={manejarCrearEntrada}
                trigger={
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nueva Entrada
                  </Button>
                }
              />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Componente de diagnóstico MediaMTX */}
        {/* <div className="mb-8">
          <MediaMTXStatus />
        </div> */}

        {entradas.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  No hay entradas de streaming
                </h3>
                <p className="text-muted-foreground mb-6">
                  Crea tu primera entrada de streaming para comenzar a distribuir contenido.
                </p>
              </div>
              <CreateEntradaModal 
                onEntradaCreada={manejarCrearEntrada}
                trigger={
                  <Button size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Crear Primera Entrada
                  </Button>
                }
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entradas.map((entrada) => (
              <StreamInputCard
                key={entrada.id}
                entrada={entrada}
                onEliminar={manejarEliminarEntrada}
                onActualizarSalida={manejarActualizarSalida}
                onEntradaActualizada={cargarEntradas}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
