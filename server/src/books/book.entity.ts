import { BookCopy } from 'src/book-copies/book-copy.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';

@Entity('book') // Таблица "book"
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column()
  publishedYear: number;

  @Column({ nullable: true })
  udc: string;

  @Column({ nullable: true })
  grnti: string;

  @Column({ nullable: true })
  isbn: string;

  @Column({ nullable: true })
  publisher: string;

  @Column({ nullable: true })
  category: string; 
  
  @Column({ nullable: true })
  pages: number;

  // Связь "один-ко-многим" с BookCopy
  @OneToMany(() => BookCopy, (copy) => copy.book, { cascade: true })
  bookCopies: BookCopy[];
}