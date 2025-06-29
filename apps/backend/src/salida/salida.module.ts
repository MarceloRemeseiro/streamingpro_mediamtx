import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalidaService } from './salida.service';
import { SalidaController } from './salida.controller';
import { SalidaStream } from './entities/salida.entity';
import { EntradaStream } from '../entrada/entities/entrada.entity';
import { PathManagerService } from '../media-mtx/services/core/path-manager.service';
// import { OutputStatusService } from './services/output-status.service'; // LEGACY - removido
import { MediaMtxModule } from '../media-mtx/media-mtx.module';
import { EstadoNuevoModule } from '../estado/estado-nuevo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalidaStream, EntradaStream]),
    forwardRef(() => MediaMtxModule),
    EstadoNuevoModule,
  ],
  controllers: [SalidaController],
  providers: [SalidaService],
  exports: [SalidaService],
})
export class SalidaModule {}
