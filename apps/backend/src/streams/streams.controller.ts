import { Controller, Post, Body, Get, Param, Put, Delete, Patch } from '@nestjs/common';
import { StreamsService } from './streams.service';
import { CrearEntradaDto } from './dto/crear-entrada.dto';
import { ActualizarEntradaDto } from './dto/actualizar-entrada.dto';
import { CrearSalidaDto } from './dto/crear-salida.dto';
import { ActualizarSalidaDto } from './dto/actualizar-salida.dto';

@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

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
}
