"use client";

import { useState, useEffect, useCallback } from 'react';
import { EstadoOutput } from '@/types/streaming';
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
  const [estado, setEstado] = useState<EstadoOutput | null>(initialEstado || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEstado = useCallback(async () => {
    if (!enabled || !outputId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get(`/salida/${outputId}/estado`);
      const nuevoEstado = response.data.estado;
      
      setEstado(nuevoEstado);
    } catch (err) {
      console.error('Error al obtener estado del output:', err);
      setError('Error al obtener estado');
    } finally {
      setIsLoading(false);
    }
  }, [outputId, enabled]);

  // Polling cada 10 segundos para outputs personalizados
  useEffect(() => {
    if (!enabled) return;

    // Fetch inicial
    fetchEstado();

    // Polling solo si hay estado inicial (es output personalizado)
    if (initialEstado !== undefined) {
      const interval = setInterval(fetchEstado, 10000); // 10 segundos
      return () => clearInterval(interval);
    }
  }, [fetchEstado, enabled, initialEstado]);

  return {
    estado,
    isLoading,
    error,
    refetch: fetchEstado,
  };
} 