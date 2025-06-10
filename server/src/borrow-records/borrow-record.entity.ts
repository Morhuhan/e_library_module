// borrow-record.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { BookCopy } from '../book-copies/book-copy.entity';
import { Person } from '../persons/person.entity';

@Entity('borrow_record')
export class BorrowRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => BookCopy, (copy) => copy.borrowRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_copy_id' })
  bookCopy: BookCopy;

  @ManyToOne(() => Person)
  @JoinColumn({ name: 'person_id' })
  person: Person;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'issued_by_user_id' })
  issuedByUser: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'accepted_by_user_id' })
  acceptedByUser: User | null;

  @Column({ name: 'borrow_date', type: 'date', default: () => 'CURRENT_DATE' })
  borrowDate: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({
    name: 'expected_return_date',
    type: 'date',
    nullable: true,
    default: () => "CURRENT_DATE + INTERVAL '1 year'",
  })
  expectedReturnDate: string | null;

  @Column({ name: 'return_date', type: 'date', nullable: true })
  returnDate: string | null;
}