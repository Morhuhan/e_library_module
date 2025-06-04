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

  /* ────────────────────────────────────────────────────────────────────── */
  /*                                PAGINATION                             */
  /* ────────────────────────────────────────────────────────────────────── */

  private baseIdsQuery(): SelectQueryBuilder<Book> {
    return this.bookRepo
      .createQueryBuilder('book')
      .leftJoin('book.authors', 'a')
      .leftJoin('book.bookCopies', 'bc')
      .leftJoin('bc.borrowRecords', 'br');
  }

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
        `(book.title ILIKE :s
          OR book.local_index ILIKE :s
          OR a.last_name   ILIKE :s
          OR a.first_name  ILIKE :s
          OR a.middle_name ILIKE :s)`,
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

    const ids = await qb
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

    const map = new Map<number, Book>(books.map(b => [b.id, b]));
    return {
      data: ids.map(id => map.get(id)!),
      total,
      page,
      limit,
    };
  }

  /* ────────────────────────────────────────────────────────────────────── */
  /*                             CRUD / READ                               */
  /* ────────────────────────────────────────────────────────────────────── */

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
      console.log('Полученные данные для обновления:', JSON.stringify(dto, null, 2));

      // Шаг 1: Найти и заблокировать только основную запись книги
      const book = await qr.manager.findOne(Book, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!book) {
        throw new NotFoundException('Книга не найдена');
      }
      console.log('Найденная книга:', JSON.stringify(book, null, 2));

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
          console.log('Найденные авторы:', authors.map(a => a.id));
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
        console.log(`Обработка кодов ${field}:`, uniqueCodes);
        try {
          const existed = await repo.find({ where: { [field]: In(uniqueCodes) } as any });
          console.log(`Существующие ${field}:`, existed);
          const toCreate = uniqueCodes.filter(c => !existed.find((e: any) => e[field] === c));
          const created = await repo.save(toCreate.map(code => ({ [field]: code } as any)));
          console.log(`Созданные ${field}:`, created);
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
            console.log('Удаляемые BBK RAW-коды:', bookWithRelations.bbkRaws);
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
            console.log('Удаляемые UDC RAW-коды:', bookWithRelations.udcRaws);
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
          console.log('Обработка места публикации:', { city, publisherName, pubYear });

          if (bookWithRelations.publicationPlaces?.length) {
            console.log('Удаляемые места публикации:', bookWithRelations.publicationPlaces);
            await qr.manager.remove(BookPubPlace, bookWithRelations.publicationPlaces);
            bookWithRelations.publicationPlaces = [];
          }

          let publisher: Publisher | null = null;
          if (publisherName) {
            try {
              publisher = await qr.manager.findOne(Publisher, { where: { name: publisherName } });
              if (!publisher) {
                publisher = await qr.manager.save(Publisher, { name: publisherName });
                console.log('Создан новый издатель:', publisher);
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
          console.log('Создано новое место публикации:', {
            id: newPlace.id,
            city: newPlace.city,
            pubYear: newPlace.pubYear,
            publisher: newPlace.publisher ? { id: newPlace.publisher.id, name: newPlace.publisher.name } : null,
          });
          bookWithRelations.publicationPlaces = [newPlace];
        } catch (err) {
          console.error('Ошибка при обновлении места публикации:', err);
          throw new BadRequestException('Ошибка при обработке места публикации');
        }
      }

      // Сохранение книги
      // Избегаем циклической сериализации, логируя только нужные поля
      console.log('Сохранение книги:', {
        id: bookWithRelations.id,
        title: bookWithRelations.title,
        localIndex: bookWithRelations.localIndex,
        bookType: bookWithRelations.bookType,
        edit: bookWithRelations.edit,
        editionStatement: bookWithRelations.editionStatement,
        physDesc: bookWithRelations.physDesc,
        series: bookWithRelations.series,
        authors: bookWithRelations.authors?.map(a => a.id),
        bbks: bookWithRelations.bbks?.map(b => b.bbkAbb),
        udcs: bookWithRelations.udcs?.map(u => u.udcAbb),
        bbkRaws: bookWithRelations.bbkRaws?.map(b => b.bbkCode),
        udcRaws: bookWithRelations.udcRaws?.map(u => u.udcCode),
        publicationPlaces: bookWithRelations.publicationPlaces?.map(p => ({
          id: p.id,
          city: p.city,
          pubYear: p.pubYear,
          publisher: p.publisher ? { id: p.publisher.id, name: p.publisher.name } : null,
        })),
      });
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