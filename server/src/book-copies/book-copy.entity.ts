import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Book } from '../books/book.entity';
import { BorrowRecord } from '../borrow-records/borrow-record.entity';

@Entity('book_copy') // Таблица public.book_copy
export class BookCopy {
  @PrimaryGeneratedColumn()
  id: number;

  // Связь: один Book &rarr; много BookCopy
  @ManyToOne(() => Book, (book) => book.bookCopies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  // copy_info text
  @Column({ name: 'copy_info', nullable: true })
  copyInfo: string;

  // При желании — массив записей о выдаче (BorrowRecord)
  @OneToMany(() => BorrowRecord, (record) => record.bookCopy)
  borrowRecords: BorrowRecord[];
}