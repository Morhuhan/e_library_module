import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BookCopy } from 'src/book-copies/book-copy.entity';

@Entity('book') 
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  title: string;

  @Column({ name: 'type', nullable: true })
  bookType: string;

  @Column({ nullable: true })
  edit: string;

  @Column({ name: 'edition_statement', nullable: true })
  editionStatement: string;

  @Column({ name: 'pub_info', nullable: true })
  pubInfo: string;

  @Column({ name: 'phys_desc', nullable: true })
  physDesc: string;

  @Column({ nullable: true })
  series: string;

  @Column({ nullable: true })
  udc: string;

  @Column({ nullable: true })
  bbk: string;

  @Column({ name: 'local_index', nullable: true })
  localIndex: string;

  @Column({ nullable: true })
  authors: string;

  @OneToMany(() => BookCopy, (copy) => copy.book, { cascade: true })
  bookCopies: BookCopy[];
}