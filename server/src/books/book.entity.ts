import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BookCopy } from 'src/book-copies/book-copy.entity';

@Entity('book') // Таблица public.book
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  // title text
  @Column({ nullable: true })
  title: string;

  // "type" text (лучше назвать поле в TS как bookType, чтобы не конфликтовать со служебным словом "type")
  @Column({ name: 'type', nullable: true })
  bookType: string;

  // edit text
  @Column({ nullable: true })
  edit: string;

  // edition_statement text
  @Column({ name: 'edition_statement', nullable: true })
  editionStatement: string;

  // pub_info text
  @Column({ name: 'pub_info', nullable: true })
  pubInfo: string;

  // phys_desc text
  @Column({ name: 'phys_desc', nullable: true })
  physDesc: string;

  // series text
  @Column({ nullable: true })
  series: string;

  // udc text
  @Column({ nullable: true })
  udc: string;

  // bbk text
  @Column({ nullable: true })
  bbk: string;

  // local_index text
  @Column({ name: 'local_index', nullable: true })
  localIndex: string;

  // authors text
  @Column({ nullable: true })
  authors: string;

  // Связь с BookCopy
  @OneToMany(() => BookCopy, (copy) => copy.book, { cascade: true })
  bookCopies: BookCopy[];
}