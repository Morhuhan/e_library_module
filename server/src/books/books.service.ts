import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  Repository,
  SelectQueryBuilder,
  QueryRunner,
} from 'typeorm';

import { Book }           from './book.entity';
import { Author }         from 'src/authors/author.entity';
import { Bbk }            from 'src/bbk/bbk.entity';
import { Udc }            from 'src/udc/udc.entity';
import { Publisher }      from 'src/publisher/publisher.entity';
import { BookPubPlace }   from 'src/book_pub_place/book-pub-place.entity';
import { BookBbkRaw }     from 'src/bbk_raw/book-bbk-raw.entity';
import { BookUdcRaw }     from 'src/udc_raw/book-udc-raw.entity';
import { BorrowRecord }   from 'src/borrow-records/borrow-record.entity';

import { UpdateBookDto } from './update-book.dto';

@Injectable()
export class BooksService {
  /* ---------- ctor ---------- */
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Book)         private readonly bookRepo:   Repository<Book>,
    @InjectRepository(Author)       private readonly authorRepo: Repository<Author>,
    @InjectRepository(Bbk)          private readonly bbkRepo:    Repository<Bbk>,
    @InjectRepository(Udc)          private readonly udcRepo:    Repository<Udc>,
    @InjectRepository(BookBbkRaw)   private readonly bbkRawRepo: Repository<BookBbkRaw>,
    @InjectRepository(BookUdcRaw)   private readonly udcRawRepo: Repository<BookUdcRaw>,
    @InjectRepository(Publisher)    private readonly pubRepo:    Repository<Publisher>,
    @InjectRepository(BookPubPlace) private readonly pubPlaceRepo: Repository<BookPubPlace>,
    @InjectRepository(BorrowRecord) private readonly borrowRepo: Repository<BorrowRecord>,
  ) {}

  /* ---------- helpers ---------- */
  /** Базовый queryBuilder только для получения id-шек (минимум join-ов) */
  private baseIdsQuery(): SelectQueryBuilder<Book> {
    return this.bookRepo
      .createQueryBuilder('book')
      .leftJoin('book.authors', 'a')
      .leftJoin('book.bookCopies', 'bc')
      .leftJoin('bc.borrowRecords', 'br');
  }

  /* ---------- публичные методы ---------- */

  /** Пагинация c фильтрами */
  async findPaginated(
    search = '',
    onlyAvailable = false,
    page = 1,
    limit = 10,
  ): Promise<{ data: Book[]; total: number; page: number; limit: number }> {
    const qb = this.baseIdsQuery()
      .select('book.id', 'id')
      .groupBy('book.id');

    if (search) {
      qb.andWhere(
        `book.title ILIKE :s
         OR a.full_name ILIKE :s
         OR book.local_index ILIKE :s`,
        { s: `%${search}%` },
      );
    }

    if (onlyAvailable) {
      qb.andWhere(`
        NOT EXISTS (
          SELECT 1
            FROM book_copy bc2
            JOIN borrow_record br2
              ON br2.book_copy_id = bc2.id
             AND br2.return_date IS NULL
           WHERE bc2.book_id = book.id
        )
      `);
    }

    const total = await qb.getCount();
    const ids   = await qb
      .orderBy('book.id', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: number }>()
      .then(rows => rows.map(r => r.id));

    if (!ids.length) return { data: [], total, page, limit };

    const books = await this.bookRepo.find({
      where: { id: In(ids) },
      relations: [
        'bookCopies', 'bookCopies.borrowRecords',
        'authors', 'bbks', 'udcs',
        'bbkRaws', 'udcRaws',
        'publicationPlaces', 'publicationPlaces.publisher',
      ],
    });

    return {
      data: ids.map(id => books.find(b => b.id === id)!),
      total,
      page,
      limit,
    };
  }

  /** Получить одну книгу со всеми зависимостями */
  async findOneWithRelations(id: number) {
    const book = await this.bookRepo.findOne({
      where: { id },
      relations: [
        'bookCopies', 'bookCopies.borrowRecords',
        'authors', 'bbks', 'udcs',
        'bbkRaws', 'udcRaws',
        'publicationPlaces', 'publicationPlaces.publisher',
      ],
    });
    if (!book) throw new NotFoundException('Книга не найдена');
    return book;
  }

  /** Создание */
  create(data: Partial<Book>) {
    return this.bookRepo.save(this.bookRepo.create(data));
  }

  /** --- ГЛАВНОЕ: исправленный update --- */
  async update(id: number, dto: UpdateBookDto) {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      /* 1. Книга + связи */
      const book = await qr.manager.findOne(Book, {
        where: { id },
        relations: [
          'authors', 'bbks', 'udcs',
          'bbkRaws', 'udcRaws',
          'publicationPlaces', 'publicationPlaces.publisher',
        ],
      });
      if (!book) throw new NotFoundException('Книга не найдена');

      /* 2. Скалярные поля */
      (
        ['title', 'localIndex', 'bookType', 'edit',
         'editionStatement', 'series', 'physDesc'] as const
      ).forEach(k => {
        if (k in dto) (book as any)[k] = (dto as any)[k];
      });

      /* 3. Авторы */
      if (dto.authorsNames) {
        const authors = await Promise.all(
          dto.authorsNames.map(async fullName => {
            const existing = await qr.manager.findOne(Author, { where: { fullName } });
            return existing ?? qr.manager.save(Author, { fullName });
          }),
        );
        book.authors = authors;
      }

      /* 4. ББК / УДК (нормализованные) */
      const syncCodes = async <T>(
        repo: Repository<T>,
        field: 'bbkAbb' | 'udcAbb',
        codes?: string[],
      ): Promise<T[] | undefined> => {
        if (!codes) return;
        const uniq     = [...new Set(codes.filter(Boolean))];
        const existed  = await repo.find({ where: { [field]: In(uniq) } as any });
        const toCreate = uniq.filter(c => !existed.find((e: any) => e[field] === c));
        const created  = await repo.save(toCreate.map(code => ({ [field]: code } as any)));
        return [...existed, ...created];
      };

      if (dto.bbkAbbs)
        book.bbks = await syncCodes(this.bbkRepo, 'bbkAbb', dto.bbkAbbs)!;
      if (dto.udcAbbs)
        book.udcs = await syncCodes(this.udcRepo, 'udcAbb', dto.udcAbbs)!;

      /* 5. RAW-коды (исправление) */
      if (dto.bbkRawCodes) {
        if (book.bbkRaws?.length) {
          const toDelete = [...book.bbkRaws];
          book.bbkRaws = [];                        // отвязали
          await qr.manager.remove(BookBbkRaw, toDelete);
        }
        book.bbkRaws = dto.bbkRawCodes
          .filter(Boolean)
          .map(code => qr.manager.create(BookBbkRaw, { book, bbkCode: code }));
      }

      if (dto.udcRawCodes) {
        if (book.udcRaws?.length) {
          const toDelete = [...book.udcRaws];
          book.udcRaws = [];                        // отвязали
          await qr.manager.remove(BookUdcRaw, toDelete);
        }
        book.udcRaws = dto.udcRawCodes
          .filter(Boolean)
          .map(code => qr.manager.create(BookUdcRaw, { book, udcCode: code }));
      }

      /* 6. Место публикации / издатель */
      if (dto.pubPlaces?.length) {
        const { city, publisherName, pubYear } = dto.pubPlaces[0];

        if (book.publicationPlaces?.length) {
          await qr.manager.remove(BookPubPlace, book.publicationPlaces);
          book.publicationPlaces = [];
        }

        let publisher: Publisher | null = null;
        if (publisherName) {
          publisher = await qr.manager.findOne(Publisher, { where: { name: publisherName } })
                   ?? await qr.manager.save(Publisher, { name: publisherName });
        }

        const newPlace = await qr.manager.save(BookPubPlace, {
          book,
          city: city || null,
          pubYear: pubYear || null,
          publisher,
        });
        book.publicationPlaces = [newPlace];
      }

      /* 7. Сохраняем агрегат и фиксируем транзакцию */
      await qr.manager.save(book);
      await qr.commitTransaction();
      return this.findOneWithRelations(id);
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  /** Удаление */
  async remove(id: number) {
    const exists = await this.bookRepo.exist({ where: { id } });
    if (!exists) throw new NotFoundException('Книга не найдена');
    await this.bookRepo.delete(id);
  }

  /** Поиск по локальному индексу */
  findOneByLocalIndex(localIndex: string) {
    return this.bookRepo.findOne({
      where: { localIndex },
      relations: [
        'bookCopies', 'bookCopies.borrowRecords',
        'authors', 'bbks', 'udcs',
        'publicationPlaces', 'publicationPlaces.publisher',
      ],
    });
  }
}