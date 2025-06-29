"use client";

import { useState, useEffect, useCallback } from 'react';
import { EstadoOutput } from '@/types/streaming';
import { useSocket } from '@/components/socket-provider';
import api from './api';

interface UseOutputStatusProps {
  outputId: string;
  initialEstado?: EstadoOutput;
  enabled?: boolean;
}

interface UseOutputStatusReturn {
  estado: EstadoOutput | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOutputStatus({ 
  outputId, 
  initialEstado, 
  enabled = true 
}: UseOutputStatusProps): UseOutputStatusReturn {
  const socket = useSocket();
  const [estado, setEstado] = useState<EstadoOutput | null>(initialEstado || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔍 LOG TEMPORAL PARA DEBUG
  console.log(`🔍 useOutputStatus [${outputId}] - Hook inicializado:`, {
    outputId,
    initialEstado,
    enabled,
    estadoActual: estado,
    socketConectado: !!socket?.connected
  });

  const refetch = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 useOutputStatus [${outputId}] - Refetch iniciado`);
      const response = await api.get(`/salida/${outputId}/estado`);
      const nuevoEstado = response.data.estado;
      
      console.log(`🔍 useOutputStatus [${outputId}] - Estado obtenido de API:`, nuevoEstado);
      setEstado(nuevoEstado);
    } catch (err) {
      console.error(`❌ useOutputStatus [${outputId}] - Error en refetch:`, err);
      setError('Error al obtener estado del output');
    } finally {
      setIsLoading(false);
    }
  }, [outputId, enabled]);

  // Escuchar eventos WebSocket
  useEffect(() => {
    if (!socket || !enabled) {
      console.log(`🔍 useOutputStatus [${outputId}] - WebSocket no disponible o hook deshabilitado`);
      return;
    }

    console.log(`🔍 useOutputStatus [${outputId}] - Configurando listeners WebSocket`);

    const handleOutputStatusChange = (data: any) => {
      console.log(`📡 useOutputStatus [${outputId}] - Evento output-status-change recibido:`, data);
      
      if (data.outputId === outputId) {
        console.log(`✅ useOutputStatus [${outputId}] - Evento es para este output, actualizando estado:`, data.estado);
        setEstado(data.estado);
      } else {
        console.log(`ℹ️ useOutputStatus [${outputId}] - Evento es para otro output (${data.outputId}), ignorando`);
      }
    };

    const handleGenericUpdate = (data: any) => {
      console.log(`📡 useOutputStatus [${outputId}] - Evento genérico recibido, refetch iniciado:`, data);
      refetch();
    };

    // Escuchar evento específico de cambio de estado
    socket.on('output-status-change', handleOutputStatusChange);
    
    // Escuchar eventos genéricos que requieren refetch
    socket.on('output-update', handleGenericUpdate);
    socket.on('stream-update', handleGenericUpdate);

    return () => {
      console.log(`🔍 useOutputStatus [${outputId}] - Limpiando listeners WebSocket`);
      socket.off('output-status-change', handleOutputStatusChange);
      socket.off('output-update', handleGenericUpdate);
      socket.off('stream-update', handleGenericUpdate);
    };
  }, [socket, outputId, enabled, refetch]);

  // Cargar estado inicial
  useEffect(() => {
    if (enabled && !initialEstado) {
      console.log(`🔍 useOutputStatus [${outputId}] - Cargando estado inicial`);
      refetch();
    }
  }, [enabled, initialEstado, refetch, outputId]);

  return {
    estado,
    isLoading,
    error,
    refetch,
  };
} 