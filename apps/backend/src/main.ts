import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para permitir peticiones del frontend
  app.enableCors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001'], // Orígenes permitidos
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Pipe de validación global para DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Ignorar propiedades no definidas en DTOs
    forbidNonWhitelisted: true, // Lanzar error si hay propiedades no permitidas
    transform: true, // Transformar payloads a instancias de DTO
  }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
