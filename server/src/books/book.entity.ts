import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { BookCopy } from 'src/book-copies/book-copy.entity';
import { Author } from 'src/authors/author.entity';
import { Bbk } from 'src/bbk/bbk.entity';
import { Udc } from 'src/udc/udc.entity';
import { BookPubPlace } from 'src/book_pub_place/book-pub-place.entity';
import { BookBbkRaw } from 'src/bbk_raw/book-bbk-raw.entity';
import { BookUdcRaw } from 'src/udc_raw/book-udc-raw.entity';

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

  @Column({ name: 'phys_desc', nullable: true })
  physDesc: string;

  @Column({ nullable: true })
  series: string;

  @ManyToMany(() => Author, { cascade: true })
  @JoinTable({
    name: 'book_author',
    joinColumn: { name: 'book_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'author_id', referencedColumnName: 'id' },
  })
  authors: Author[];

  @ManyToMany(() => Bbk, { cascade: true })
  @JoinTable({
    name: 'book_bbk',
    joinColumn: { name: 'book_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'bbk_id', referencedColumnName: 'id' },
  })
  bbks: Bbk[];

  @ManyToMany(() => Udc, { cascade: true })
  @JoinTable({
    name: 'book_udc',
    joinColumn: { name: 'book_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'udc_id', referencedColumnName: 'id' },
  })
  udcs: Udc[];

  @OneToMany(() => BookCopy, (copy) => copy.book, { cascade: true })
  bookCopies: BookCopy[];

  @OneToMany(() => BookPubPlace, (pubPlace) => pubPlace.book, { cascade: true })
  publicationPlaces: BookPubPlace[];

  @OneToMany(() => BookBbkRaw, raw => raw.book)
  bbkRaws: BookBbkRaw[];

  @OneToMany(() => BookUdcRaw, raw => raw.book)
  udcRaws: BookUdcRaw[];
}