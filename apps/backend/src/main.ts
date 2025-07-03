import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  try {
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
    
    console.log('🔄 Iniciando servidor HTTP...');
    console.log('📍 Puerto:', port);
    console.log('📍 Host: 0.0.0.0 (todas las interfaces)');
    
    await app.listen(port, '0.0.0.0');  // Escuchar en todas las interfaces
    
    console.log('🚀 Backend iniciado en puerto', port);
    console.log('🌐 CORS habilitado para:', corsOrigin);
    console.log('📡 WebSocket Gateway disponible');
    console.log('🔗 API disponible en: /api/*');
    console.log('🔗 Escuchando en: 0.0.0.0:' + port);
    console.log('✅ Servidor HTTP listo para recibir conexiones');
    
  } catch (error) {
    console.error('❌ Error crítico iniciando el backend:', error);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  }
}

bootstrap().catch(error => {
  console.error('❌ Error crítico en bootstrap:', error);
  process.exit(1);
});
