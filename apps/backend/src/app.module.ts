import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { EntradaModule } from './entrada/entrada.module';
import { SalidaModule } from './salida/salida.module';
import { EstadoNuevoModule } from './estado/estado-nuevo.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { MediaMtxModule } from './media-mtx/media-mtx.module';
import { Controller, Get } from '@nestjs/common';

// Controlador simple para health check
@Controller()
export class AppController {
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'StreamingPro Backend'
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' 
        ? '.env.production' 
        : '.env.development',
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
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
