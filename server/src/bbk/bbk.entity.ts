import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Book } from '../books/book.entity';

@Entity('bbk')
export class Bbk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'bbk_abb', unique: true })
  bbkAbb: string;

  @Column({ nullable: true })
  description: string | null;

  @ManyToMany(() => Book, (book) => book.bbks)
  books: Book[];
}