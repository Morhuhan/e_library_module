import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Book } from '../books/book.entity';
import { Student } from '../students/student.entity';
import { User } from '../users/user.entity';

@Entity('borrow_record')
export class BorrowRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Book, (book) => book.borrowRecords)
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  // Поле, указывающее на пользователя, который ВЫДАЛ книгу
  @ManyToOne(() => User)
  @JoinColumn({ name: 'issued_by_user_id' })
  issuedByUser: User;

  // Поле, указывающее на пользователя, который ПРИНЯЛ (вернул) книгу
  @ManyToOne(() => User)
  @JoinColumn({ name: 'accepted_by_user_id' })
  acceptedByUser: User;

  @Column({ name: 'borrow_date', type: 'date', nullable: true })
  borrowDate: string | null;

  @Column({ name: 'return_date', type: 'date', nullable: true })
  returnDate: string | null;
}