import { z } from "zod";
import { ProtocoloStream, ProtocoloSalida } from "@/types/streaming";

export const crearEntradaSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre debe tener menos de 100 caracteres"),
  protocolo: z.nativeEnum(ProtocoloStream, {
    errorMap: () => ({ message: "Selecciona un protocolo válido" }),
  }),
  latenciaSRT: z
    .number()
    .int()
    .min(80, "La latencia mínima es 80ms")
    .max(2000, "La latencia máxima es 2000ms")
    .optional(),
  incluirPassphrase: z.boolean().optional(),
});

export const editarEntradaSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre debe tener menos de 100 caracteres"),
  latenciaSRT: z
    .number()
    .int()
    .min(80, "La latencia mínima es 80ms")
    .max(2000, "La latencia máxima es 2000ms")
    .optional(),
});

// Esquemas para salidas personalizadas
export const crearSalidaSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre debe tener menos de 100 caracteres"),
  protocolo: z.nativeEnum(ProtocoloSalida, {
    errorMap: () => ({ message: "Selecciona un protocolo válido" }),
  }),
  entradaId: z.string().min(1, "ID de entrada requerido"),
  urlDestino: z
    .string()
    .url("Debe ser una URL válida")
    .min(1, "La URL es requerida"),
  
  // Campos RTMP
  claveStreamRTMP: z
    .string()
    .max(100, "La stream key debe tener menos de 100 caracteres")
    .optional(),
  
  // Campos SRT
  puertoSRT: z
    .number()
    .int()
    .min(1, "El puerto debe ser mayor a 0")
    .max(65535, "El puerto debe ser menor a 65535")
    .optional(),
  latenciaSRT: z
    .number()
    .int()
    .min(80, "La latencia mínima es 80ms")
    .max(2000, "La latencia máxima es 2000ms")
    .optional(),
  passphraseSRT: z
    .string()
    .max(79, "La passphrase debe tener menos de 80 caracteres")
    .optional(),
  streamIdSRT: z
    .string()
    .max(100, "El Stream ID debe tener menos de 100 caracteres")
    .optional(),
    
  // Campos HLS
  segmentDuration: z
    .number()
    .int()
    .min(2, "La duración mínima es 2 segundos")
    .max(10, "La duración máxima es 10 segundos")
    .optional(),
  playlistLength: z
    .number()
    .int()
    .min(3, "El mínimo son 3 segmentos")
    .max(10, "El máximo son 10 segmentos")
    .optional(),
}).refine(
  (data) => {
    // Validaciones específicas por protocolo
    if (data.protocolo === ProtocoloSalida.RTMP) {
      return data.claveStreamRTMP !== undefined && data.claveStreamRTMP !== "" && data.claveStreamRTMP.length > 0;
    }
    if (data.protocolo === ProtocoloSalida.SRT) {
      return data.puertoSRT !== undefined && typeof data.puertoSRT === 'number' && data.puertoSRT > 0;
    }
    return true;
  },
  {
    message: "Faltan campos requeridos para el protocolo seleccionado",
    path: ["protocolo"],
  }
);

// Esquema para editar salidas (sin entradaId y protocolo)
export const editarSalidaSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre debe tener menos de 100 caracteres"),
  urlDestino: z
    .string()
    .url("Debe ser una URL válida")
    .min(1, "La URL es requerida"),
  
  // Campos RTMP
  claveStreamRTMP: z
    .string()
    .max(100, "La stream key debe tener menos de 100 caracteres")
    .optional(),
  
  // Campos SRT
  puertoSRT: z
    .number()
    .int()
    .min(1, "El puerto debe ser mayor a 0")
    .max(65535, "El puerto debe ser menor a 65535")
    .optional(),
  latenciaSRT: z
    .number()
    .int()
    .min(80, "La latencia mínima es 80ms")
    .max(2000, "La latencia máxima es 2000ms")
    .optional(),
  passphraseSRT: z
    .string()
    .max(79, "La passphrase debe tener menos de 80 caracteres")
    .optional(),
  streamIdSRT: z
    .string()
    .max(100, "El Stream ID debe tener menos de 100 caracteres")
    .optional(),
    
  // Campos HLS
  segmentDuration: z
    .number()
    .int()
    .min(2, "La duración mínima es 2 segundos")
    .max(10, "La duración máxima es 10 segundos")
    .optional(),
  playlistLength: z
    .number()
    .int()
    .min(3, "El mínimo son 3 segmentos")
    .max(10, "El máximo son 10 segmentos")
    .optional(),
});

export type CrearEntradaFormData = z.infer<typeof crearEntradaSchema>;
export type EditarEntradaFormData = z.infer<typeof editarEntradaSchema>;
export type CrearSalidaFormData = z.infer<typeof crearSalidaSchema>;
export type EditarSalidaFormData = z.infer<typeof editarSalidaSchema>; 