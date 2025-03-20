import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './book.entity';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) {}

  /**
   * Получить все книги (со списком экземпляров)
   */
  findAll(): Promise<Book[]> {
    return this.bookRepository.find({
      relations: ['bookCopies'],
    });
  }

  /**
   * Пагинация и фильтр:
   * - search: строка поиска (например, по title)
   * - onlyAvailable: если true, показываем только книги,
   *   у которых есть хотя бы один доступный экземпляр
   * - page: номер страницы (1-based)
   * - limit: количество записей на странице
   *
   * Возвращает объект со структурой: { data, total, page, limit }
   */
  async findPaginated(
    search: string,
    onlyAvailable: boolean,
    page: number,
    limit: number,
  ): Promise<{
    data: Book[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Создаём QueryBuilder
    let qb = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.bookCopies', 'bookCopy')
      .leftJoinAndSelect('bookCopy.borrowRecords', 'borrowRecord');

    // Если задана строка поиска, ищем по названию
    if (search) {
      qb = qb.where('book.title LIKE :search', { search: `%${search}%` });
    }

    // Фильтр: onlyAvailable
    if (onlyAvailable) {
      qb = qb.andWhere(`
        EXISTS (
          SELECT 1
          FROM "book_copy" bc
          WHERE bc."book_id" = book.id
            AND NOT EXISTS (
              SELECT 1
              FROM "borrow_record" br
              WHERE br."book_copy_id" = bc.id
                AND br."return_date" IS NULL
            )
        )
      `);
    }

    // Пагинация
    qb = qb.skip((page - 1) * limit).take(limit);

    // Выполняем запрос, получаем [массивКниг, сколькоВсего]
    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Получить книгу по ID (и её экземпляры + borrowRecords)
   */
  async findOneWithRelations(id: number): Promise<Book> {
    return this.bookRepository.findOneOrFail({
      where: { id },
      relations: ['bookCopies', 'bookCopies.borrowRecords'],
    });
  }

  /**
   * Создать новую книгу
   */
  async create(data: Partial<Book>): Promise<Book> {
    const book = this.bookRepository.create(data);
    return this.bookRepository.save(book);
  }

  /**
   * Обновить существующую книгу
   */
  async update(id: number, data: Partial<Book>): Promise<Book | null> {
    const existing = await this.bookRepository.findOne({ where: { id } });
    if (!existing) {
      return null;
    }
    await this.bookRepository.update(id, data);
    return this.findOneWithRelations(id);
  }

  /**
   * Удалить книгу
   */
  async remove(id: number): Promise<void> {
    await this.bookRepository.delete(id);
  }

  /**
   * Поиск по полю localIndex (используется в /books/find?searchType=local_index)
   */
  async findOneByLocalIndex(localIndex: string): Promise<Book | null> {
    return this.bookRepository.findOne({
      where: { localIndex },
      relations: ['bookCopies', 'bookCopies.borrowRecords'],
    });
  }
}