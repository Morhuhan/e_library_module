import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { Book } from './book.entity';
import { BookCopy } from 'src/book-copies/book-copy.entity';
import { BorrowRecord } from 'src/borrow-records/borrow-record.entity';
import { Author } from 'src/authors/author.entity';
import { Bbk } from 'src/bbk/bbk.entity';
import { Udc } from 'src/udc/udc.entity';
import { BookPubPlace } from 'src/book_pub_place/book-pub-place.entity';
import { Publisher } from 'src/publisher/publisher.entity';
import { BookBbkRaw } from 'src/bbk_raw/book-bbk-raw.entity';
import { BookUdcRaw } from 'src/udc_raw/book-udc-raw.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Book,
      BookCopy,
      BorrowRecord,
      Author,
      Bbk,
      Udc,
      BookPubPlace,
      Publisher,
      BookBbkRaw,
      BookUdcRaw,
    ]),
  ],
  providers: [BooksService],
  controllers: [BooksController],
  exports: [BooksService],
})
export class BooksModule {}