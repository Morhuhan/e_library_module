import { BookPubPlace } from 'src/book_pub_place/book-pub-place.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('publisher')
export class Publisher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true })
  name: string;

  @OneToMany(() => BookPubPlace, (bookPubPlace) => bookPubPlace.publisher)
  bookPubPlaces: BookPubPlace[];
}