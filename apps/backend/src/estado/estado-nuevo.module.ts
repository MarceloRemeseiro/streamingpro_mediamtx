import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntradaStream } from '../entrada/entities/entrada.entity';
import { SalidaStream } from '../salida/entities/salida.entity';
import { EstadoEntradasService } from './services/estado-entradas.service';
import { EstadoSalidasService } from './services/estado-salidas.service';
import { EstadoCoordinadorService } from './estado-coordinador.service';
import { MediaMtxModule } from '../media-mtx/media-mtx.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([EntradaStream, SalidaStream]),
    forwardRef(() => MediaMtxModule),
    HttpModule,
  ],
  providers: [
    EstadoEntradasService,
    EstadoSalidasService,
    EstadoCoordinadorService,
  ],
  exports: [
    EstadoEntradasService,
    EstadoSalidasService,
    EstadoCoordinadorService,
  ],
})
export class EstadoNuevoModule {} 