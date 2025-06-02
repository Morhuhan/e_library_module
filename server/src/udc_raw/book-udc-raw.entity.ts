// src/book-udc-raw/book-udc-raw.entity.ts
import { Book } from 'src/books/book.entity';
import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('book_udc_raw')
export class BookUdcRaw {
  @PrimaryColumn({ name: 'book_id', type: 'int' })
  bookId: number;

  @PrimaryColumn({ name: 'udc_code', type: 'text' })
  udcCode: string;

  @ManyToOne(() => Book, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book;
}