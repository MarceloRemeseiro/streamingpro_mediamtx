import { Controller, Post, Body, Get, Param, Put, Delete, Patch, InternalServerErrorException } from '@nestjs/common';
import { StreamsService } from './streams.service';
import { CrearEntradaDto } from './dto/crear-entrada.dto';
import { ActualizarEntradaDto } from './dto/actualizar-entrada.dto';
import { CrearSalidaDto } from './dto/crear-salida.dto';
import { ActualizarSalidaDto } from './dto/actualizar-salida.dto';
import { MediaMTXService } from '../mediamtx/mediamtx.service';
import { Logger } from '@nestjs/common';

@Controller('streams')
export class StreamsController {
  private readonly logger = new Logger(StreamsController.name);

  constructor(
    private readonly streamsService: StreamsService,
    private readonly mediaMTXService: MediaMTXService
  ) {}

  @Post('entradas')
  crearEntrada(@Body() crearEntradaDto: CrearEntradaDto) {
    return this.streamsService.crearEntrada(crearEntradaDto);
  }

  @Get('entradas')
  obtenerEntradas() {
    return this.streamsService.obtenerEntradas();
  }

  @Get('entradas/:id')
  obtenerEntradaPorId(@Param('id') id: string) {
    return this.streamsService.obtenerEntradaPorId(id);
  }

  @Put('entradas/:id')
  actualizarEntrada(
    @Param('id') id: string,
    @Body() actualizarEntradaDto: ActualizarEntradaDto,
  ) {
    return this.streamsService.actualizarEntrada(id, actualizarEntradaDto);
  }

  @Delete('entradas/:id')
  eliminarEntrada(@Param('id') id: string) {
    return this.streamsService.eliminarEntrada(id);
  }

  @Post('salidas')
  crearSalida(@Body() crearSalidaDto: CrearSalidaDto) {
    return this.streamsService.crearSalida(crearSalidaDto.entradaId, crearSalidaDto);
  }

  @Get('salidas')
  obtenerSalidas() {
    return this.streamsService.obtenerSalidas();
  }

  @Get('outputs/by-stream-key/:streamKey')
  async obtenerOutputsPorStreamKey(@Param('streamKey') streamKey: string) {
    return this.streamsService.obtenerOutputsPorStreamKey(streamKey);
  }

  @Get('entradas/:entradaId/salidas')
  obtenerSalidasPorEntrada(@Param('entradaId') entradaId: string) {
    return this.streamsService.obtenerSalidasPorEntrada(entradaId);
  }

  @Get('salidas/:id')
  obtenerSalidaPorId(@Param('id') id: string) {
    return this.streamsService.obtenerSalidaPorId(id);
  }

  @Put('salidas/:id')
  actualizarSalida(
    @Param('id') id: string,
    @Body() actualizarSalidaDto: ActualizarSalidaDto,
  ) {
    return this.streamsService.actualizarSalida(id, actualizarSalidaDto);
  }

  @Delete('salidas/:id')
  eliminarSalida(@Param('id') id: string) {
    return this.streamsService.eliminarSalida(id);
  }

  @Get('entradas/:id/outputs/estado')
  async obtenerEstadoOutputsEntrada(@Param('id') id: string) {
    return this.streamsService.obtenerEstadoOutputsEntrada(id);
  }

  @Patch('entradas/:id/outputs/hot-reload')
  async hotReloadOutputsEntrada(@Param('id') id: string) {
    return this.streamsService.forzarSincronizacionEntrada(id);
  }

  @Get('sistema/estadisticas')
  async obtenerEstadisticasCompletas() {
    const entradas = await this.streamsService.obtenerEntradas();
      
    const totalOutputs = entradas.reduce((sum, entrada) => sum + (entrada.salidas?.length || 0), 0);
    
    const outputsHabilitados = entradas.reduce((sum, entrada) => 
      sum + (entrada.salidas?.filter(s => s.habilitada).length || 0), 0);

    const outputsPorProtocolo = entradas.reduce((acc, entrada) => {
      entrada.salidas?.forEach(salida => {
        acc[salida.protocolo] = (acc[salida.protocolo] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      outputs: {
        total: totalOutputs,
        habilitados: outputsHabilitados,
        deshabilitados: totalOutputs - outputsHabilitados,
        porProtocolo: outputsPorProtocolo,
      },
      entradas: {
        total: entradas.length,
        conOutputs: entradas.filter(e => e.salidas?.length > 0).length,
        sinOutputs: entradas.filter(e => e.salidas?.length === 0).length,
        activas: entradas.filter(e => e.activo).length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('debug/mediamtx-nativo/:id')
  async debugAPINativa(@Param('id') id: string) {
    this.logger.log(`🚀 Testing API nativa para entrada: ${id}`);
    
    try {
      // Obtener configuración actual de paths
      const configuracion = await this.mediaMTXService.obtenerConfiguracionPaths();
      
      // Simular sincronización nativa
             const entrada = await this.streamsService.obtenerEntradaPorId(id);
      if (!entrada) {
        throw new Error(`Entrada ${id} no encontrada`);
      }

      const outputs = entrada.salidas.filter(s => !['SRT Pull', 'RTMP Pull', 'HLS'].includes(s.nombre));
      
             // Calcular path usando MediaMTX service
       const pathCalculado = this.mediaMTXService.calcularPathEntrada(entrada);
       
       return {
         mensaje: '✅ Prueba de API nativa exitosa',
         entrada: entrada.nombre,
         path: pathCalculado,
         outputsPersonalizados: outputs.length,
         configuracionActual: configuracion
       };
      
    } catch (error) {
      this.logger.error(`❌ Error en prueba API nativa: ${error.message}`);
      throw new InternalServerErrorException(`Error API nativa: ${error.message}`);
    }
  }
}
