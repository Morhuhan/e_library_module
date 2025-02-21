import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BorrowRecord } from './borrow-record.entity';
import { BorrowRecordsService } from './borrow-records.service';
import { BorrowRecordsController } from './borrow-records.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BorrowRecord])],
  providers: [BorrowRecordsService],
  controllers: [BorrowRecordsController],
  exports: [BorrowRecordsService],
})
export class BorrowRecordsModule {}