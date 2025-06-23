import { Controller, Post, Body, Get, Param, Put, Delete } from '@nestjs/common';
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
    return this.streamsService.crearSalida(crearSalidaDto);
  }

  @Get('salidas')
  obtenerSalidas() {
    return this.streamsService.obtenerSalidas();
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
}
