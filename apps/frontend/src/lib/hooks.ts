import { useState, useEffect } from 'react';

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