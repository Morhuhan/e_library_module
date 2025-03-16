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

  // Ссылка на экземпляр книги
  @ManyToOne(() => BookCopy, (copy) => copy.borrowRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'book_copy_id' })
  bookCopy: BookCopy;

  // Кто взял книгу (Person вместо Student)
  @ManyToOne(() => Person)
  @JoinColumn({ name: 'person_id' })
  person: Person;

  // Кто выдал
  @ManyToOne(() => User)
  @JoinColumn({ name: 'issued_by_user_id' })
  issuedByUser: User;

  // Кто принял (вернул)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'accepted_by_user_id' })
  acceptedByUser: User;

  // Дата выдачи
  @Column({ name: 'borrow_date', type: 'date', nullable: true })
  borrowDate: string | null;

  // Дата возврата
  @Column({ name: 'return_date', type: 'date', nullable: true })
  returnDate: string | null;
}