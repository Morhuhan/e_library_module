import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Student } from '../students/student.entity';
import { User } from '../users/user.entity';
import { BookCopy } from '../book-copies/book-copy.entity';

@Entity('borrow_record')
export class BorrowRecord {
  @PrimaryGeneratedColumn()
  id: number;

  // Ссылка на конкретный экземпляр книги
  @ManyToOne(() => BookCopy, (copy) => copy.borrowRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'book_copy_id' })
  bookCopy: BookCopy;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  // Кто выдал
  @ManyToOne(() => User)
  @JoinColumn({ name: 'issued_by_user_id' })
  issuedByUser: User;

  // Кто принял (вернул)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'accepted_by_user_id' })
  acceptedByUser: User;

  @Column({ name: 'borrow_date', type: 'date', nullable: true })
  borrowDate: string | null;

  @Column({ name: 'return_date', type: 'date', nullable: true })
  returnDate: string | null;
}