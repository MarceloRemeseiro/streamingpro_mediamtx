import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntradaStream } from '../../../entrada/entities/entrada.entity';
import { MediaMTXApiService } from '../core/mediamtx-api.service';
import { IStreamSyncService } from '../../interfaces/stream-integration.interface';
import { EstadoEntradasService } from '../../../estado/services/estado-entradas.service';
import { PathManagerService } from '../core/path-manager.service';

/**
 * Servicio de sincronización que mantiene el estado de las entradas
 * sincronizado con el estado real de MediaMTX
 */
@Injectable()
export class StreamSyncService implements IStreamSyncService {
  private readonly logger = new Logger(StreamSyncService.name);

  constructor(
    @InjectRepository(EntradaStream)
    private readonly entradaRepository: Repository<EntradaStream>,
    private readonly apiService: MediaMTXApiService,
    private readonly estadoEntradasService: EstadoEntradasService,
    private readonly pathManager: PathManagerService,
  ) {}

  /**
   * Sincroniza el estado de todas las entradas con MediaMTX
   */
  async syncInputStates(): Promise<void> {
    try {
      this.logger.debug('🔄 Iniciando sincronización de estado con MediaMTX');
      
      // Obtener todas las entradas de la BD
      const entradas = await this.entradaRepository.find();
      
      if (entradas.length === 0) {
        this.logger.debug('📝 No hay entradas para sincronizar');
        return;
      }

      // Obtener estado de todos los paths de MediaMTX
      const pathsInfo = await this.apiService.listPaths();
      
      // Crear mapa de paths por nombre para búsqueda rápida
      const pathsMap = new Map();
      pathsInfo.forEach(path => {
        pathsMap.set(path.name, path);
      });

      // Sincronizar cada entrada
      let cambiosRealizados = 0;
      const updatePromises = entradas.map(async (entrada) => {
        const pathName = this.pathManager.generateInputPathName(entrada);
        const pathInfo = pathsMap.get(pathName);
        
        const nuevoEstado = pathInfo?.ready ?? false;
        
        if (entrada.activa !== nuevoEstado) {
          entrada.activa = nuevoEstado;
          await this.entradaRepository.save(entrada);
          cambiosRealizados++;
          
          this.logger.debug(
            `🔄 Entrada "${entrada.nombre}" cambió estado: ${entrada.activa ? 'ACTIVA' : 'INACTIVA'}`
          );

          // 🔥 La emisión WebSocket ya se maneja automáticamente por EstadoEntradasService
        }
      });

      await Promise.all(updatePromises);

      if (cambiosRealizados > 0) {
        this.logger.log(`✅ Sincronización completada: ${cambiosRealizados} cambios de estado`);
      } else {
        this.logger.debug('✅ Sincronización completada: sin cambios');
      }
    } catch (error) {
      this.logger.error('❌ Error durante sincronización con MediaMTX:', error.message);
      throw error;
    }
  }

  /**
   * Sincroniza el estado de una entrada específica
   */
  async syncInputState(entrada: EntradaStream): Promise<boolean> {
    try {
      const pathName = this.pathManager.generateInputPathName(entrada);
      const pathInfo = await this.apiService.getPath(pathName);
      
      const nuevoEstado = pathInfo?.ready ?? false;
      
      if (entrada.activa !== nuevoEstado) {
        entrada.activa = nuevoEstado;
        await this.entradaRepository.save(entrada);
        
        this.logger.debug(
          `🔄 Entrada "${entrada.nombre}" sincronizada: ${entrada.activa ? 'ACTIVA' : 'INACTIVA'}`
        );

        // 🔥 La emisión WebSocket ya se maneja automáticamente por EstadoEntradasService
        
        return true; // Hubo cambio
      }
      
      return false; // No hubo cambio
    } catch (error) {
      this.logger.error(`❌ Error sincronizando entrada '${entrada.nombre}':`, error.message);
      throw error;
    }
  }

  /**
   * Fuerza una sincronización inmediata (útil para testing y debugging)
   */
  async forceSync(): Promise<void> {
    this.logger.log('🔧 Forzando sincronización inmediata');
    await this.syncInputStates();
  }

  /**
   * Obtiene métricas de sincronización
   */
  async getSyncMetrics(): Promise<{
    totalInputs: number;
    activeInputs: number;
    inactiveInputs: number;
    lastSyncTime: Date;
  }> {
    const entradas = await this.entradaRepository.find();
    const totalInputs = entradas.length;
    const activeInputs = entradas.filter(e => e.activa).length;
    const inactiveInputs = totalInputs - activeInputs;

    return {
      totalInputs,
      activeInputs,
      inactiveInputs,
      lastSyncTime: new Date(),
    };
  }

  /**
   * Inicia la sincronización automática periódica
   */
  private syncInterval: NodeJS.Timeout | null = null;
  
  startAutoSync(intervalMs: number = 5000): void {
    if (this.syncInterval) {
      this.logger.warn('La sincronización automática ya está en ejecución');
      return;
    }

    this.logger.log(`🚀 Iniciando sincronización automática cada ${intervalMs}ms`);
    
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncInputStates();
      } catch (error) {
        this.logger.error('Error en sincronización automática:', error.message);
      }
    }, intervalMs);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.logger.log('⏹️ Sincronización automática detenida');
    }
  }

  // =============================================================================
  // MÉTODOS PRIVADOS
  // =============================================================================
} 