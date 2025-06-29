import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { EntradaModule } from './entrada/entrada.module';
import { SalidaModule } from './salida/salida.module';
import { EstadoNuevoModule } from './estado/estado-nuevo.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { MediaMtxModule } from './media-mtx/media-mtx.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
    }),
    EntradaModule,
    SalidaModule,
    EstadoNuevoModule,
    EstadisticasModule,
    MediaMtxModule,
  ],
})
export class AppModule {}
