import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Manufacturer OPEN')
    .setDescription('The Manufacturer scraping API description')
    .setVersion('1.0')
    .addTag('manufacturer')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3111);
  const logger = new Logger('🔥🚀');
  logger.log(`V8 is running in port:3111 🔥🚀🔥🚀🔥🚀🔥`);
}
bootstrap();
