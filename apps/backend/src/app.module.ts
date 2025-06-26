import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { EntradaModule } from './entrada/entrada.module';
import { SalidaModule } from './salida/salida.module';
import { EstadoModule } from './estado/estado.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';

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
    EstadoModule,
    EstadisticasModule
  ],
})
export class AppModule {}
