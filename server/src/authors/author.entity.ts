import { Book } from 'src/books/book.entity';
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'author' })
export class Author {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'patronymic', nullable: true })
  patronymic?: string | null;

  @Column({ name: 'birth_year', type: 'int', nullable: true })
  birthYear?: number | null;

  @ManyToMany(() => Book, (b) => b.authors)
  books: Book[];
}