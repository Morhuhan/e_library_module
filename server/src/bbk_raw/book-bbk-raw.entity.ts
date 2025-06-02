// src/book-bbk-raw/book-bbk-raw.entity.ts
import { Book } from 'src/books/book.entity';
import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('book_bbk_raw')
export class BookBbkRaw {
  @PrimaryColumn({ name: 'book_id', type: 'int' })
  bookId: number;

  @PrimaryColumn({ name: 'bbk_code', type: 'text' })
  bbkCode: string;

  @ManyToOne(() => Book, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book;
}