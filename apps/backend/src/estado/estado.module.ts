import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadoService } from './estado.service';
import { EstadoController } from './estado.controller';
import { EntradaStream } from '../entrada/entities/entrada.entity';
import { SalidaStream } from '../salida/entities/salida.entity';
import { MediaMtxModule } from '../media-mtx/media-mtx.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EntradaStream, SalidaStream]),
    forwardRef(() => MediaMtxModule),
  ],
  controllers: [EstadoController],
  providers: [EstadoService],
  exports: [EstadoService],
})
export class EstadoModule {}
