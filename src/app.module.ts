import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ManufacturerModule } from './manufacturer/manufacturer.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManufacturerEntity } from './common/entities';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'manufacturer.db',
      entities: [ManufacturerEntity],
      synchronize: true,
    }),
    ManufacturerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
