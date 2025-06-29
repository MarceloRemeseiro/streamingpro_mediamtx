import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntradaService } from './entrada.service';
import { EntradaController } from './entrada.controller';
import { EntradaStream } from './entities/entrada.entity';
import { SalidaStream } from '../salida/entities/salida.entity';
import { MediaMtxModule } from '../media-mtx/media-mtx.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EntradaStream, SalidaStream]),
    MediaMtxModule,
  ],
  controllers: [EntradaController],
  providers: [EntradaService],
  exports: [EntradaService],
})
export class EntradaModule {}
