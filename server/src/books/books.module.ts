import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { Book } from './book.entity';
import { BookCopy } from 'src/book-copies/book-copy.entity';
import { BorrowRecord } from 'src/borrow-records/borrow-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Book, BookCopy, BorrowRecord])],
  providers: [BooksService],
  controllers: [BooksController],
  exports: [BooksService],
})
export class BooksModule {}