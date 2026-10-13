import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Elimina propiedades no definidas en el DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas
      transform: true,            // Transforma los datos al tipo del DTO
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Habilitar CORS para que Flutter pueda conectarse
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Prefijo global para la API
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Servidor corriendo en: http://localhost:${port}/api`);
}
bootstrap();