"use client";

import React from 'react';
import { EstadoOutput } from '@/types/streaming';
import { cn } from '@/lib/utils';

interface OutputStatusIndicatorProps {
  estado?: EstadoOutput;
  className?: string;
  esOutputPersonalizado?: boolean;
  habilitada?: boolean;
}

export function OutputStatusIndicator({ estado, className, esOutputPersonalizado, habilitada }: OutputStatusIndicatorProps) {
  // Si no es output personalizado, no mostrar LED
  if (!esOutputPersonalizado) {
    return null;
  }

  // Para outputs personalizados sin estado, inferir el estado basándose en si está habilitado
  const estadoFinal = estado || (habilitada ? EstadoOutput.CONECTANDO : EstadoOutput.APAGADO);

  const getStatusConfig = (estado: EstadoOutput) => {
    switch (estado) {
      case EstadoOutput.APAGADO:
        return {
          color: 'bg-gray-400',
          label: 'Apagado',
          animate: false,
        };
      case EstadoOutput.CONECTANDO:
        return {
          color: 'bg-orange-500',
          label: 'Conectando...',
          animate: true,
        };
      case EstadoOutput.CONECTADO:
        return {
          color: 'bg-green-500',
          label: 'Conectado',
          animate: false,
        };
      case EstadoOutput.ERROR:
        return {
          color: 'bg-red-500',
          label: 'Error',
          animate: false,
        };
      default:
        return {
          color: 'bg-gray-400',
          label: 'Desconocido',
          animate: false,
        };
    }
  };

  const config = getStatusConfig(estadoFinal);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* LED Indicador */}
      <div
        className={cn(
          "w-2 h-2 rounded-full",
          config.color,
          config.animate && "animate-pulse"
        )}
        title={config.label}
      />
      
      {/* Texto del estado (opcional, solo en vista expandida) */}
      <span className="text-xs text-muted-foreground hidden group-hover:inline">
        {config.label}
      </span>
    </div>
  );
} 