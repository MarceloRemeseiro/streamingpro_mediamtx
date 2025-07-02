import { useState, useEffect } from 'react';
import { EstadisticasDispositivos } from '@/types/streaming';
import { mediaMtxApi } from './api';
import { useSocket } from '@/components/socket-provider';

/**
 * Hook para manejar estado persistente en localStorage
 * @param key - Clave para localStorage
 * @param defaultValue - Valor por defecto
 * @returns [value, setValue] - Estado y función para actualizarlo
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
        return defaultValue;
      }
    }
    return defaultValue;
  });

  const setStoredValue = (newValue: T) => {
    try {
      setValue(newValue);
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(newValue));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [value, setStoredValue];
}

/**
 * Hook específico para manejar el estado de collapses de una entrada
 * @param entradaId - ID de la entrada
 * @returns Objeto con estados y setters para cada sección
 */
export function useCollapseState(entradaId: string) {
  const [videoExpanded, setVideoExpanded] = useLocalStorage(`collapse-${entradaId}-video`, false);
  const [datosExpanded, setDatosExpanded] = useLocalStorage(`collapse-${entradaId}-datos`, false);
  const [outputsExpanded, setOutputsExpanded] = useLocalStorage(`collapse-${entradaId}-outputs`, false);
  const [customOutputsExpanded, setCustomOutputsExpanded] = useLocalStorage(`collapse-${entradaId}-custom-outputs`, false);

  return {
    videoExpanded,
    setVideoExpanded,
    datosExpanded,
    setDatosExpanded,
    outputsExpanded,
    setOutputsExpanded,
    customOutputsExpanded,
    setCustomOutputsExpanded,
  };
}

/**
 * Hook para obtener estadísticas de dispositivos conectados en tiempo real via WebSocket
 * @returns Objeto con estadísticas, loading y error
 */
export function useDeviceStats() {
  const [stats, setStats] = useState<EstadisticasDispositivos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  useEffect(() => {
    // Fetch inicial via API
    const fetchInitialStats = async () => {
      try {
        const data = await mediaMtxApi.obtenerEstadisticasOutputsPorDefecto();
        setStats(data);
        setLoading(false);
      } catch (err) {
        console.warn('Error fetching initial device stats:', err);
        setError(err instanceof Error ? err.message : 'Error obteniendo estadísticas iniciales');
        setLoading(false);
      }
    };

    fetchInitialStats();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listener para actualizaciones via WebSocket
    const handleDeviceStatsUpdate = (data: { stats: EstadisticasDispositivos; timestamp: string }) => {
      console.log('📊 Stats actualizadas:', data.stats);
      setStats(data.stats);
      setError(null);
    };

    socket.on('device-stats-update', handleDeviceStatsUpdate);

    return () => {
      socket.off('device-stats-update', handleDeviceStatsUpdate);
    };
  }, [socket]);

  return { stats, loading, error };
} 