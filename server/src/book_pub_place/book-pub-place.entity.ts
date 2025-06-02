import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { Book } from '../books/book.entity';
import { Publisher } from '../publisher/publisher.entity';

@Entity('book_pub_place')
@Check(`"publisher_id" IS NOT NULL OR "city" IS NOT NULL`)
export class BookPubPlace {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Book, (book) => book.publicationPlaces, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @ManyToOne(() => Publisher, (publisher) => publisher.bookPubPlaces, { nullable: true })
  @JoinColumn({ name: 'publisher_id' })
  publisher: Publisher | null;

  @Column({ type: 'text', nullable: true })
  city: string | null;

  @Column({ name: 'pub_year', type: 'int', nullable: true })
  pubYear: number | null;
}