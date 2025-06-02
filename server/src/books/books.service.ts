import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Book } from './book.entity';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) {}

  /* ---------------- базовый запрос со всеми нужными JOIN-ами -------- */
  private baseIdsQuery(): SelectQueryBuilder<Book> {
    return this.bookRepository
      .createQueryBuilder('book')
      .leftJoin('book.bookCopies',        'bc')
      .leftJoin('bc.borrowRecords',       'br')
      .leftJoin('book.authors',           'a');
  }

  /* ---------------------------- ПАГИНАЦИЯ --------------------------- */
  async findPaginated(
    search = '',
    onlyAvailable = false,
    page   = 1,
    limit  = 10,
  ): Promise<{ data: Book[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    /* ---------- 1. id-шники нужной страницы ---------- */
    let qb = this.baseIdsQuery().select('book.id', 'id').groupBy('book.id');

    if (search) {
      qb = qb.andWhere(
        `LOWER(book.title)      LIKE LOWER(:s)
      OR LOWER(a.full_name)    LIKE LOWER(:s)
      OR book.local_index      ILIKE :s`,
        { s: `%${search}%` },
      );
    }

    if (onlyAvailable) {
      qb = qb.andWhere(`
        EXISTS (
          SELECT 1
          FROM book_copy bc2
          WHERE bc2.book_id = book.id
            AND NOT EXISTS (
              SELECT 1
              FROM borrow_record br2
              WHERE br2.book_copy_id = bc2.id
                AND br2.return_date IS NULL
            )
        )
      `);
    }

    const total = await qb.getCount();

    const ids   = await qb
      .orderBy('book.id', 'ASC')
      .offset(offset)
      .limit(limit)
      .getRawMany<{ id: number }>()
      .then(r => r.map(({ id }) => id));

    if (!ids.length) return { data: [], total, page, limit };

    /* ---------- 2. тянем книги с отношениями ---------- */
    const books = await this.bookRepository.find({
      where: { id: In(ids) },
      relations: [
        'bookCopies',
        'bookCopies.borrowRecords',
        'authors',
        'bbks',
        'udcs',
        'bbkRaws',
        'udcRaws',
        'publicationPlaces',
        'publicationPlaces.publisher',
      ],
    });

    /* ---------- 3. сохраняем порядок ---------- */
    const ordered = ids.map(id => books.find(b => b.id === id)!);

    return { data: ordered, total, page, limit };
  }

  /* ---------------------- остальные методы (без изменений) ---------- */

  async findAll(): Promise<Book[]> {
    return this.bookRepository.find({
      relations: [
        'bookCopies',
        'authors',
        'bbks',
        'udcs',
        'bbkRaws',
        'udcRaws',
        'publicationPlaces',
        'publicationPlaces.publisher',
      ],
    });
  }

  async findOneWithRelations(id: number): Promise<Book> {
    const book = await this.bookRepository.findOne({
      where: { id },
      relations: [
        'bookCopies',
        'bookCopies.borrowRecords',
        'authors',
        'bbks',
        'udcs',
        'bbkRaws',
        'udcRaws',
        'publicationPlaces',
        'publicationPlaces.publisher',
      ],
    });
    if (!book) throw new NotFoundException('Книга не найдена');
    return book;
  }

  async create(data: Partial<Book>): Promise<Book> {
    return this.bookRepository.save(this.bookRepository.create(data));
  }

  async update(id: number, data: Partial<Book>): Promise<Book | null> {
    await this.bookRepository.update(id, data);
    return this.findOneWithRelations(id);
  }

  async remove(id: number): Promise<void> {
    const book = await this.bookRepository.findOne({ where: { id } });
    if (!book) throw new NotFoundException('Книга не найдена');
    await this.bookRepository.delete(id);
  }

  async findOneByLocalIndex(localIndex: string): Promise<Book | null> {
    return this.bookRepository.findOne({
      where: { localIndex },
      relations: [
        'bookCopies',
        'bookCopies.borrowRecords',
        'authors',
        'bbks',
        'udcs',
        'publicationPlaces',
        'publicationPlaces.publisher',
      ],
    });
  }
}