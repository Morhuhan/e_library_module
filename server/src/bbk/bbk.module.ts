// src/library/bbk.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bbk } from './bbk.entity';
import { BbkController } from './bbk.controller';
import { BbkService } from './bbk.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bbk])],
  controllers: [BbkController],
  providers: [BbkService],
})
export class BbkModule {}