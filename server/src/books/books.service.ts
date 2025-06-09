// src/books/books.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
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

  private baseIdsQuery(): SelectQueryBuilder<Book> {
    return this.bookRepo
      .createQueryBuilder('book')
      .leftJoin('book.authors',         'a')
      .leftJoin('book.bbks',            'bbk')
      .leftJoin('book.udcs',            'udc')
      .leftJoin('book.bbkRaws',         'bbr')
      .leftJoin('book.udcRaws',         'udr')
      .leftJoin('book.publicationPlaces','pp')
      .leftJoin('pp.publisher',         'pub')
      .leftJoin('book.bookCopies',      'bc')
      .leftJoin('bc.borrowRecords',     'br');
  }

async findPaginated(
  search = '',
  searchColumn = '',
  onlyAvailable = false,
  onlyIssued    = false,
  page = 1,
  limit = 10,
  sort = '',
): Promise<{ data: Book[]; total: number; page: number; limit: number }> {

  if (onlyAvailable && onlyIssued) {
    throw new BadRequestException(
      'Параметры onlyAvailable и onlyIssued не могут быть одновременно true',
    );
  }

  const qb = this.baseIdsQuery()
    .select('book.id', 'id')
    .groupBy('book.id');

  if (search) {
    const colMap: Record<string, string> = {
      localIndex: 'book.local_index',
      title:      'book.title',
      authors:    "concat_ws(' ', a.last_name, a.first_name, a.patronymic)",
      bookType:   'book.type',
      edit:       'book.edit',
      series:     'book.series',
      physDesc:   'book.phys_desc',
      bbks:       "string_agg(distinct bbk.bbk_abb, ',')",
      udcs:       "string_agg(distinct udc.udc_abb, ',')",
      bbkRaws:    "string_agg(distinct bbr.bbk_code, ',')",
      udcRaws:    "string_agg(distinct udr.udc_code, ',')",
      publicationPlaces:
        "string_agg(distinct concat_ws(' ', pp.city, pub.name, pp.pub_year), ',')",
    };

    if (searchColumn && colMap[searchColumn]) {
      const expr = colMap[searchColumn];
      const param = { s: `%${search}%` };

      // простая эвристика: если в выражении есть агрегат — используем HAVING
      const usesAggregate = /string_agg|count|sum|min|max|avg/i.test(expr);

      if (usesAggregate) {
        qb.andHaving(`${expr} ILIKE :s`, param);
      } else {
        qb.andWhere(`${expr} ILIKE :s`, param);
      }
    } else {
      // общий полнотекстовый поиск без изменения
      qb.andWhere(
        `(book.title ILIKE :s
          OR book.local_index ILIKE :s
          OR book.phys_desc ILIKE :s
          OR book.series ILIKE :s
          OR book.edit  ILIKE :s
          OR a.last_name   ILIKE :s
          OR a.first_name  ILIKE :s
          OR a.patronymic ILIKE :s)`,
        { s: `%${search}%` },
      );

      console.log('Запрос после добавления условия поиска:', qb.getQueryAndParameters());
    }
  }

    if (onlyIssued) {
    qb.andWhere(`
      EXISTS (
        SELECT 1
          FROM book_copy bc2
          JOIN borrow_record br2
            ON br2.book_copy_id = bc2.id
          AND br2.return_date IS NULL
        WHERE bc2.book_id = book.id
      )
    `);
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

    const allowed: Record<string, { col: string; type: 'text' | 'number' }> = {
      localIndex:        { col: 'MIN(book.local_index)', type: 'text' },
      title:             { col: 'MIN(book.title)',       type: 'text' },
      authors:           { col: "string_agg(DISTINCT a.last_name, ',')", type: 'text' },
      bookType:          { col: 'MIN(book.type)',        type: 'text' },
      edit:              { col: 'MIN(book.edit)',        type: 'text' },
      series:            { col: 'MIN(book.series)',      type: 'text' },
      physDesc:          { col: 'MIN(book.phys_desc)',   type: 'text' },
      bbks:              { col: "string_agg(DISTINCT bbk.bbk_abb, ',')",  type: 'text' },
      udcs:              { col: "string_agg(DISTINCT udc.udc_abb, ',')",  type: 'text' },
      bbkRaws:           { col: "string_agg(DISTINCT bbr.bbk_code, ',')", type: 'text' },
      udcRaws:           { col: "string_agg(DISTINCT udr.udc_code, ',')", type: 'text' },
      publicationPlaces: { col: "string_agg(DISTINCT concat_ws(' ', pp.city, pub.name, pp.pub_year), ',')", type: 'text' },
      id:                { col: 'book.id', type: 'number' },
    };

    const [singleField, ordRaw] = sort.split('.');
    if (allowed[singleField]) {
      const { col, type } = allowed[singleField];
      const order: 'ASC' | 'DESC' = ordRaw === 'desc' ? 'DESC' : 'ASC';
      if (type === 'text') {
        qb.orderBy(`CASE WHEN ${col} ~ '^[A-ZА-Я]' THEN 0 ELSE 1 END`, 'ASC')
          .addOrderBy(`LOWER(${col})`, order);
      } else {
        qb.orderBy(col, order);
      }
    } else {
      qb.orderBy('book.id', 'ASC');
    }

    const total = await qb.getCount();
    const ids = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: number }>()
      .then(rows => rows.map(r => r.id));

    if (!ids.length) {
      return { data: [], total, page, limit };
    }

    const books = await this.bookRepo.find({
      where: { id: In(ids) },
      relations: [
        'bookCopies', 'bookCopies.borrowRecords',
        'authors', 'bbks', 'udcs',
        'bbkRaws', 'udcRaws',
        'publicationPlaces', 'publicationPlaces.publisher',
      ],
    });

    const map = new Map<number, Book>(books.map(b => [b.id, b]));
    const result = {
      data: ids.map(id => map.get(id)!),
      total,
      page,
      limit,
    };

    return result;
  }

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

  create(data: Partial<Book>) {
    return this.bookRepo.save(this.bookRepo.create(data));
  }

  /* ────────────────────────────────────────────────────────────────────── */
  /*                               UPDATE                                  */
  /* ────────────────────────────────────────────────────────────────────── */

  async update(id: number, dto: UpdateBookDto) {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Шаг 1: Найти и заблокировать только основную запись книги
      const book = await qr.manager.findOne(Book, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!book) {
        throw new NotFoundException('Книга не найдена');
      }

      // Шаг 2: Подгрузить связанные данные без блокировки
      const bookWithRelations = await qr.manager.findOne(Book, {
        where: { id },
        relations: [
          'authors', 'bbks', 'udcs',
          'bbkRaws', 'udcRaws',
          'publicationPlaces', 'publicationPlaces.publisher',
        ],
      });
      if (!bookWithRelations) {
        throw new NotFoundException('Книга не найдена');
      }

      // Обновление скалярных полей
      const scalarFields = ['title', 'localIndex', 'bookType', 'edit', 'editionStatement', 'series', 'physDesc'] as const;
      scalarFields.forEach(key => {
        if (key in dto) {
          (bookWithRelations as any)[key] = (dto as any)[key] ?? null;
        }
      });

      // Обновление авторов
      if (dto.authorsIds && dto.authorsIds.length) {
        try {
          const authors = await qr.manager.find(Author, {
            where: { id: In(dto.authorsIds) },
          });
          if (authors.length !== dto.authorsIds.length) {
            throw new BadRequestException(`Найдено ${authors.length} авторов из ${dto.authorsIds.length}. Проверьте ID авторов.`);
          }
          bookWithRelations.authors = authors;
        } catch (err) {
          console.error('Ошибка при обновлении авторов:', err);
          throw new BadRequestException('Ошибка при обработке авторов');
        }
      }

      // Хелпер для нормализованных кодов (BBK/UDC)
      const syncCodes = async <T>(
        repo: Repository<T>,
        field: 'bbkAbb' | 'udcAbb',
        codes?: string[],
      ): Promise<T[] | undefined> => {
        if (!codes || !codes.length) return undefined;
        const uniqueCodes = [...new Set(codes.filter(Boolean))];
        try {
          const existed = await repo.find({ where: { [field]: In(uniqueCodes) } as any });
          const toCreate = uniqueCodes.filter(c => !existed.find((e: any) => e[field] === c));
          const created = await repo.save(toCreate.map(code => ({ [field]: code } as any)));
          return [...existed, ...created];
        } catch (err) {
          console.error(`Ошибка при обработке ${field}:`, err);
          throw new BadRequestException(`Ошибка при обработке ${field}`);
        }
      };

      // Обновление BBK и UDC
      if (dto.bbkAbbs) {
        bookWithRelations.bbks = await syncCodes(this.bbkRepo, 'bbkAbb', dto.bbkAbbs) ?? bookWithRelations.bbks;
      }
      if (dto.udcAbbs) {
        bookWithRelations.udcs = await syncCodes(this.udcRepo, 'udcAbb', dto.udcAbbs) ?? bookWithRelations.udcs;
      }

      // Обновление RAW-кодов BBK
      if (dto.bbkRawCodes) {
        try {
          if (bookWithRelations.bbkRaws?.length) {
            await qr.manager.remove(BookBbkRaw, bookWithRelations.bbkRaws);
            bookWithRelations.bbkRaws = [];
          }
          bookWithRelations.bbkRaws = dto.bbkRawCodes
            .filter(Boolean)
            .map(code => qr.manager.create(BookBbkRaw, { book: bookWithRelations, bbkCode: code }));
        } catch (err) {
          console.error('Ошибка при обновлении BBK RAW-кодов:', err);
          throw new BadRequestException('Ошибка при обработке BBK RAW-кодов');
        }
      }

      // Обновление RAW-кодов UDC
      if (dto.udcRawCodes) {
        try {
          if (bookWithRelations.udcRaws?.length) {
            await qr.manager.remove(BookUdcRaw, bookWithRelations.udcRaws);
            bookWithRelations.udcRaws = [];
          }
          bookWithRelations.udcRaws = dto.udcRawCodes
            .filter(Boolean)
            .map(code => qr.manager.create(BookUdcRaw, { book: bookWithRelations, udcCode: code }));
        } catch (err) {
          console.error('Ошибка при обновлении UDC RAW-кодов:', err);
          throw new BadRequestException('Ошибка при обработке UDC RAW-кодов');
        }
      }

      // Обновление мест публикации
      if (dto.pubPlaces?.length) {
        try {
          const { city, publisherName, pubYear } = dto.pubPlaces[0];

          if (bookWithRelations.publicationPlaces?.length) {
            await qr.manager.remove(BookPubPlace, bookWithRelations.publicationPlaces);
            bookWithRelations.publicationPlaces = [];
          }

          let publisher: Publisher | null = null;
          if (publisherName) {
            try {
              publisher = await qr.manager.findOne(Publisher, { where: { name: publisherName } });
              if (!publisher) {
                publisher = await qr.manager.save(Publisher, { name: publisherName });
              }
            } catch (err) {
              console.error('Ошибка при обработке издателя:', err);
              throw new BadRequestException('Ошибка при создании или поиске издателя');
            }
          }

          const newPlace = await qr.manager.create(BookPubPlace, {
            book: bookWithRelations,
            city: city || null,
            pubYear: pubYear || null,
            publisher,
          });
          bookWithRelations.publicationPlaces = [newPlace];
        } catch (err) {
          console.error('Ошибка при обновлении места публикации:', err);
          throw new BadRequestException('Ошибка при обработке места публикации');
        }
      }

      await qr.manager.save(Book, bookWithRelations);
      await qr.commitTransaction();

      // Возвращаем обновлённую книгу с отношениями
      return await this.findOneWithRelations(id);
    } catch (err) {
      await qr.rollbackTransaction();
      console.error('Ошибка в методе update:', err);
      throw err instanceof NotFoundException || err instanceof BadRequestException
        ? err
        : new BadRequestException('Ошибка при обновлении книги');
    } finally {
      await qr.release();
    }
  }

  /* ────────────────────────────────────────────────────────────────────── */
  /*                                 DELETE                                */
  /* ────────────────────────────────────────────────────────────────────── */

  async remove(id: number) {
    const exists = await this.bookRepo.exist({ where: { id } });
    if (!exists) throw new NotFoundException('Книга не найдена');
    await this.bookRepo.delete(id);
  }

  /* ────────────────────────────────────────────────────────────────────── */
  /*                        find by local index helper                     */
  /* ────────────────────────────────────────────────────────────────────── */

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