"use client";

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { StreamInputCard } from '@/components/stream-input-card';
import { CreateEntradaModal } from '@/components/create-entrada-modal';
import { MediaMTXStatus } from '@/components/mediamtx-status';
import { EntradaStream } from '@/types/streaming';
import { entradasApi, salidasApi } from '@/lib/api';

export default function Home() {
  const [entradas, setEntradas] = useState<EntradaStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar entradas al montar el componente
  useEffect(() => {
    cargarEntradas();
  }, []);

  const cargarEntradas = async () => {
    try {
      setLoading(true);
      const data = await entradasApi.obtenerTodas();
      setEntradas(data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar entradas:', err);
      setError('Error al cargar las entradas de streaming');
    } finally {
      setLoading(false);
    }
  };

  const manejarEliminarEntrada = async (id: string) => {
    try {
      await entradasApi.eliminar(id);
      setEntradas(prev => prev.filter(entrada => entrada.id !== id));
    } catch (error) {
      console.error('Error al eliminar entrada:', error);
      // TODO: Mostrar notificación de error
    }
  };

  const manejarActualizarSalida = async (salidaId: string, habilitada: boolean) => {
    try {
      await salidasApi.actualizar(salidaId, { habilitada });
      // Actualizar el estado local
      setEntradas(prev => 
        prev.map(entrada => ({
          ...entrada,
          salidas: entrada.salidas.map(salida => 
            salida.id === salidaId ? { ...salida, habilitada } : salida
          )
        }))
      );
    } catch (error) {
      console.error('Error al actualizar salida:', error);
      // TODO: Mostrar notificación de error
    }
  };



  const manejarCrearEntrada = () => {
    // Recargar entradas después de crear una nueva
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
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                StreamingPro Restreamer
              </h1>
              <p className="text-sm text-muted-foreground">
                Plataforma de distribución de streaming SRT/RTMP
              </p>
            </div>
            <div className="flex items-center gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
