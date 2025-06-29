import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { EntradaService } from './entrada.service';
import { CreateEntradaDto } from './dto/create-entrada.dto';
import { UpdateEntradaDto } from './dto/update-entrada.dto';
import { ReordenarEntradasDto } from './dto/reordenar-entradas.dto';
import { StreamSyncService } from '../media-mtx/services/integration/stream-sync.service';

@Controller('entrada')
export class EntradaController {
  constructor(
    private readonly entradaService: EntradaService,
    private readonly syncService: StreamSyncService,
  ) {}

  @Post()
  create(@Body() createEntradaDto: CreateEntradaDto) {
    return this.entradaService.create(createEntradaDto);
  }

  @Get()
  findAll() {
    return this.entradaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.entradaService.obtenerEntradaPorId(id);
  }

  @Get('validar-nombre/:nombre')
  validarNombre(@Param('nombre') nombre: string) {
    return this.entradaService.validarNombreDisponible(nombre);
  }

  @Patch('reordenar')
  @HttpCode(HttpStatus.OK)
  reordenarEntradas(@Body() reordenarEntradasDto: ReordenarEntradasDto) {
    return this.entradaService.reordenarEntradas(reordenarEntradasDto.ids);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEntradaDto: UpdateEntradaDto) {
    return this.entradaService.update(id, updateEntradaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.entradaService.remove(id);
  }

  @Post('sync')
  async sincronizarEstado() {
    await this.syncService.forceSync();
    return { message: 'Sincronización de estado completada' };
  }
}
