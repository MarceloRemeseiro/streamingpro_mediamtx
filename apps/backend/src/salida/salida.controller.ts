import { Controller, Get, Post, Body, Patch, Param, Delete, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { SalidaService } from './salida.service';
import { CreateSalidaDto } from './dto/create-salida.dto';
import { UpdateSalidaDto } from './dto/update-salida.dto';
import { ReordenarSalidasDto } from './dto/reordenar-salidas.dto';
// import { OutputStatusService } from './services/output-status.service'; // LEGACY - removido

@Controller('salida')
export class SalidaController {
  private readonly logger = new Logger(SalidaController.name);

  constructor(
    private readonly salidaService: SalidaService,
    // private readonly outputStatusService: OutputStatusService, // LEGACY - removido
  ) {}

  @Post()
  create(@Body() createSalidaDto: CreateSalidaDto) {
    this.logger.log(`📨 POST /salida - Creando nueva salida`);
    return this.salidaService.create(createSalidaDto);
  }

  @Get()
  findAll() {
    this.logger.log(`📨 GET /salida - Obteniendo todas las salidas`);
    return this.salidaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    this.logger.log(`📨 GET /salida/${id} - Obteniendo salida por ID`);
    return this.salidaService.findOne(id);
  }

  @Patch('reordenar')
  @HttpCode(HttpStatus.OK)
  reordenarSalidas(@Body() reordenarSalidasDto: ReordenarSalidasDto) {
    this.logger.log(`📨 PATCH /salida/reordenar - Reordenando salidas`);
    return this.salidaService.reordenarSalidas(reordenarSalidasDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSalidaDto: UpdateSalidaDto) {
    this.logger.log(`📨 PATCH /salida/${id} - Actualizando salida:`, JSON.stringify(updateSalidaDto));
    return this.salidaService.update(id, updateSalidaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.logger.log(`📨 DELETE /salida/${id} - Eliminando salida`);
    return this.salidaService.remove(id);
  }

  // ===== ENDPOINTS DE ESTADO =====

  @Get(':id/estado')
  async obtenerEstadoOutput(@Param('id') id: string) {
    this.logger.log(`📨 GET /salida/${id}/estado - Obteniendo estado de output`);
    const salida = await this.salidaService.findOne(id);
    return { 
      id, 
      estado: salida.estado,
      habilitada: salida.habilitada,
      procesoFantasmaPid: salida.procesoFantasmaPid
    };
  }

  @Post(':id/verificar-estado')
  @HttpCode(HttpStatus.OK)
  async verificarEstadoOutput(@Param('id') id: string) {
    this.logger.log(`📨 POST /salida/${id}/verificar-estado - Estado manejado automáticamente por EstadoSalidasService`);
    
    const salida = await this.salidaService.findOne(id);
    if (!salida) {
      return { error: 'Output no encontrado' };
    }
    
    // El EstadoSalidasService se encarga del monitoreo automático cada 5 segundos
    // No necesitamos verificación manual
    return { 
      id, 
      estado: salida.estado,
      habilitada: salida.habilitada,
      mensaje: 'El estado se actualiza automáticamente cada 5 segundos'
    };
  }
}
