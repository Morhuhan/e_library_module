import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Book } from '../books/book.entity';

@Entity('author')
export class Author {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name', unique: true })
  fullName: string;

  @ManyToMany(() => Book, (book) => book.authors)
  books: Book[];
}