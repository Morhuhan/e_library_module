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

@Entity('book_copy') 
export class BookCopy {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Book, (book) => book.bookCopies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ name: 'copy_info', nullable: true })
  copyInfo: string;

  @OneToMany(() => BorrowRecord, (record) => record.bookCopy)
  borrowRecords: BorrowRecord[];
}