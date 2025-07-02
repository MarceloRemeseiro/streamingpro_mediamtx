import axios from 'axios';
import { EntradaStream, SalidaStream, CrearEntradaDto, CrearSalidaDto, EstadisticasDispositivos } from '@/types/streaming';
import { config } from './config';

const api = axios.create({
  baseURL: config.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API de Entradas
export const entradasApi = {
  // Obtener todas las entradas
  obtenerTodas: async (): Promise<EntradaStream[]> => {
    const response = await api.get('/entrada');
    return response.data;
  },

  // Obtener entrada por ID
  obtenerPorId: async (id: string): Promise<EntradaStream> => {
    const response = await api.get(`/entrada/${id}`);
    return response.data;
  },

  // Crear nueva entrada
  crear: async (entrada: CrearEntradaDto): Promise<EntradaStream> => {
    const response = await api.post('/entrada', entrada);
    return response.data;
  },

  // Actualizar entrada
  actualizar: async (id: string, entrada: Partial<CrearEntradaDto>): Promise<EntradaStream> => {
    const response = await api.patch(`/entrada/${id}`, entrada);
    return response.data;
  },

  // Eliminar entrada
  eliminar: async (id: string): Promise<void> => {
    await api.delete(`/entrada/${id}`);
  },

  // Reordenar entradas
  reordenar: async (ids: string[]): Promise<void> => {
    await api.patch('/entrada/reordenar', { ids });
  },

  // Validar nombre de entrada
  validarNombre: async (nombre: string): Promise<{ disponible: boolean }> => {
    const response = await api.get(`/entrada/validar-nombre/${encodeURIComponent(nombre)}`);
    return response.data;
  },
};

// API de Salidas
export const salidasApi = {
  // Obtener todas las salidas
  obtenerTodas: async (): Promise<SalidaStream[]> => {
    const response = await api.get('/salida');
    return response.data;
  },

  // Obtener salidas de una entrada
  obtenerPorEntrada: async (entradaId: string): Promise<SalidaStream[]> => {
    const response = await api.get(`/salida`);
    // Filtrar por entradaId en el frontend ya que todas las salidas vienen con la relación
    return response.data.filter((salida: SalidaStream) => salida.entradaId === entradaId);
  },

  // Obtener salida por ID
  obtenerPorId: async (id: string): Promise<SalidaStream> => {
    const response = await api.get(`/salida/${id}`);
    return response.data;
  },

  // Crear nueva salida
  crear: async (salida: CrearSalidaDto): Promise<SalidaStream> => {
    const response = await api.post('/salida', salida);
    return response.data;
  },

  // Actualizar salida
  actualizar: async (id: string, salida: Partial<CrearSalidaDto & { habilitada: boolean }>): Promise<SalidaStream> => {
    const response = await api.patch(`/salida/${id}`, salida);
    return response.data;
  },

  // Reordenar salidas
  reordenar: async (salidaIds: string[]): Promise<void> => {
    await api.patch('/salida/reordenar', { salidaIds });
  },

  // Eliminar salida
  eliminar: async (id: string): Promise<void> => {
    await api.delete(`/salida/${id}`);
  },
};

// API de MediaMTX - Estadísticas
export const mediaMtxApi = {
  // Obtener estadísticas de dispositivos conectados a outputs por defecto
  obtenerEstadisticasOutputsPorDefecto: async (): Promise<EstadisticasDispositivos> => {
    const response = await api.get('/media-mtx/stats/default-outputs');
    return response.data.data;
  },
};

export default api; 