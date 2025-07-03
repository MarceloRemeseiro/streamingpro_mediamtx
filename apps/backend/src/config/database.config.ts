import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EntradaStream, SalidaStream } from '../entities';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  // Configuración directa sin parsear URL para evitar problemas SSL
  return {
    type: 'postgres',
    host: 'postgres',
    port: 5432,
    username: configService.get<string>('POSTGRES_USER'),
    password: configService.get<string>('POSTGRES_PASSWORD'),
    database: configService.get<string>('POSTGRES_DB'),
    entities: [EntradaStream, SalidaStream],
    synchronize: process.env.NODE_ENV === 'development', // Solo sincronizar en desarrollo
    dropSchema: false, // NUNCA borrar el esquema automáticamente
    logging: process.env.NODE_ENV === 'development',
    ssl: false, // SSL deshabilitado para contenedores Docker
    extra: {
      ssl: false, // Configuración adicional para deshabilitar SSL
      sslmode: 'disable', // Parámetro adicional
    },
  };
}; 