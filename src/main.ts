import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 👇 Detectar entorno (producción vs local)
  const isProduction = process.env.NODE_ENV === 'production';
  const uploadsPath = isProduction 
    ? '/app/uploads' 
    : join(__dirname, '..', 'uploads');

  console.log(`📁 Sirviendo archivos desde: ${uploadsPath}`);

  // Servir archivos estáticos
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Servidor: http://localhost:${port}/api`);
  console.log(`📁 Uploads: http://localhost:${port}/uploads/`);
}
bootstrap();