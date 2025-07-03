import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EntradaStream, SalidaStream } from '../entities';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  // Configuración directa sin parsear URL para evitar problemas SSL
  const isDevelopment = process.env.NODE_ENV === 'development';
  const forceSync = configService.get<string>('TYPEORM_SYNC') === 'true';
  
  return {
    type: 'postgres',
    host: 'postgres',
    port: 5432,
    username: configService.get<string>('POSTGRES_USER'),
    password: configService.get<string>('POSTGRES_PASSWORD'),
    database: configService.get<string>('POSTGRES_DB'),
    entities: [EntradaStream, SalidaStream],
    synchronize: isDevelopment || forceSync, // Sincronizar en desarrollo o si se fuerza
    dropSchema: false, // NUNCA borrar el esquema automáticamente
    logging: isDevelopment,
    ssl: false, // SSL deshabilitado para contenedores Docker
    extra: {
      ssl: false, // Configuración adicional para deshabilitar SSL
      sslmode: 'disable', // Parámetro adicional
    },
  };
}; 