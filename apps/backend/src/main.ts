import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Configurar adapter de Socket.IO
  app.useWebSocketAdapter(new IoAdapter(app));

  // Configurar global prefix para todas las rutas HTTP
  app.setGlobalPrefix('api');

  // Habilitar CORS - usar variables de entorno o fallback para desarrollo
  const corsOrigin = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3001', 'http://127.0.0.1:3001'];

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Configuración global de ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades que no están en el DTO
      forbidNonWhitelisted: false, // No lanza error si hay propiedades no esperadas
      transform: true, // Transforma el payload a una instancia del DTO
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log('🚀 Backend iniciado en puerto', port);
  console.log('🌐 CORS habilitado para:', corsOrigin);
  console.log('📡 WebSocket Gateway disponible');
  console.log('🔗 API disponible en: /api/*');
}
bootstrap();
