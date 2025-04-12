// src/reports/reports.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BorrowRecord } from '../borrow-records/borrow-record.entity';
import { Book } from '../books/book.entity';
import { Person } from '../persons/person.entity'; 
import { BookCopy } from '../book-copies/book-copy.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BorrowRecord, Book, Person, BookCopy]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}