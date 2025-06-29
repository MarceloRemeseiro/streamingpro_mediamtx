import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { SalidaStream } from "@/types/streaming"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Verifica si un output es personalizado (no por defecto)
 * Los outputs por defecto son: SRT Pull, RTMP Pull, HLS
 */
export function esOutputPersonalizado(salida: SalidaStream): boolean {
  const OUTPUTS_POR_DEFECTO = ['SRT Pull', 'RTMP Pull', 'HLS'];
  return !OUTPUTS_POR_DEFECTO.includes(salida.nombre);
}
