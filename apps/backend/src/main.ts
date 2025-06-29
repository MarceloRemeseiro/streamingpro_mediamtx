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

  // Habilitar CORS para permitir peticiones desde el frontend
  app.enableCors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
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

  await app.listen(3000);
  console.log('🚀 Backend iniciado en puerto 3000');
  console.log('📡 WebSocket Gateway disponible en ws://localhost:3000');
}
bootstrap();
