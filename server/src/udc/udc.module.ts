// src/library/udc.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UdcController } from './udc.controller';
import { Udc } from './udc.entity';
import { UdcService } from './udc.service';

@Module({
  imports: [TypeOrmModule.forFeature([Udc])],
  controllers: [UdcController],
  providers: [UdcService],
})
export class UdcModule {}