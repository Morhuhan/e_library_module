import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Book } from '../books/book.entity';

@Entity('udc')
export class Udc {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'udc_abb', unique: true })
  udcAbb: string;

  @Column({ nullable: true })
  description: string | null;

  @ManyToMany(() => Book, (book) => book.udcs)
  books: Book[];
}