import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EstadisticasService } from './estadisticas.service';
import { CreateEstadisticaDto } from './dto/create-estadistica.dto';
import { UpdateEstadisticaDto } from './dto/update-estadistica.dto';

@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Post()
  create(@Body() createEstadisticaDto: CreateEstadisticaDto) {
    return this.estadisticasService.create(createEstadisticaDto);
  }

  @Get()
  findAll() {
    return this.estadisticasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.estadisticasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEstadisticaDto: UpdateEstadisticaDto) {
    return this.estadisticasService.update(+id, updateEstadisticaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.estadisticasService.remove(+id);
  }
}
