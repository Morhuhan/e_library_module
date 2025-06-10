// book-copy.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { Book } from '../books/book.entity';
import { BorrowRecord } from '../borrow-records/borrow-record.entity';

@Entity('book_copy')
@Unique(['book', 'inventoryNo'])
export class BookCopy {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Book, (book) => book.bookCopies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ name: 'inventory_no' })
  inventoryNo: string;

  @Column({ name: 'receipt_date', type: 'date', nullable: true })
  receiptDate?: Date;

  @Column({ name: 'storage_place', nullable: true })
  storagePlace?: string;

  @Column({ name: 'price', type: 'numeric', precision: 12, scale: 2, nullable: true })
  price?: number;

  @OneToMany(() => BorrowRecord, (record) => record.bookCopy)
  borrowRecords: BorrowRecord[];
}