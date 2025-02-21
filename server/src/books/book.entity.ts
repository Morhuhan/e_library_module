// src/books/book.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BorrowRecord } from '../borrow-records/borrow-record.entity';

@Entity('book') // Имя таблицы – 'book'
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'title' })
  title: string;

  @Column({ name: 'author' })
  author: string;

  @Column({ name: 'publishedYear' })
  publishedYear: number;

  @Column({ name: 'isbn', nullable: true })
  isbn: string;

  @Column({ name: 'localNumber', nullable: true })
  localNumber: string;

  @OneToMany(() => BorrowRecord, (record) => record.book, { cascade: true })
  borrowRecords: BorrowRecord[];
}