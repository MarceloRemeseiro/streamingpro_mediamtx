import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EntradaStream, SalidaStream } from '../entities';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Parsear la URL de PostgreSQL
  const url = new URL(databaseUrl);
  
  return {
    type: 'postgres',
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    username: url.username,
    password: url.password,
    database: url.pathname.slice(1), // Remover el '/' inicial
    entities: [EntradaStream, SalidaStream],
    synchronize: process.env.NODE_ENV === 'development', // Solo sincronizar en desarrollo
    dropSchema: false, // NUNCA borrar el esquema automáticamente
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
}; 