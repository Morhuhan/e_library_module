import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BookCopy } from './book-copy.entity';
import { Repository } from 'typeorm';

@Injectable()
export class BookCopiesService {
  constructor(
    @InjectRepository(BookCopy)
    private readonly bookCopyRepository: Repository<BookCopy>,
  ) {}

  // Без пагинации: получить все экземпляры (связи: book и borrowRecords)
  findAll(): Promise<BookCopy[]> {
    return this.bookCopyRepository.find({
      relations: ['book', 'borrowRecords'],
    });
  }

  // Найти один экземпляр по ID (со связями)
  findOne(id: number): Promise<BookCopy | null> {
    return this.bookCopyRepository.findOne({
      where: { id },
      relations: ['book', 'borrowRecords'],
    });
  }

  // Создать экземпляр (поля: book, copyInfo)
  async create(data: Partial<BookCopy>): Promise<BookCopy> {
    const copy = this.bookCopyRepository.create(data);
    return this.bookCopyRepository.save(copy);
  }

  // Обновить экземпляр
  async update(id: number, data: Partial<BookCopy>): Promise<BookCopy | null> {
    await this.bookCopyRepository.update(id, data);
    return this.findOne(id);
  }

  // Удалить экземпляр
  async remove(id: number): Promise<void> {
    await this.bookCopyRepository.delete(id);
  }

  // Поиск по copyInfo (пример)
  async findByCopyInfo(info: string): Promise<BookCopy | null> {
    return this.bookCopyRepository.findOne({
      where: { copyInfo: info },
      relations: ['book', 'borrowRecords'],
    });
  }

  // ======== Метод для пагинации ========
  async findPaginated(
    search: string,
    onlyAvailable: boolean,
    page: number,
    limit: number,
  ): Promise<{
    data: BookCopy[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Создаём QueryBuilder
    const qb = this.bookCopyRepository.createQueryBuilder('copy')
      .leftJoinAndSelect('copy.book', 'book')
      .leftJoinAndSelect('copy.borrowRecords', 'borrowRecords');

    // Фильтрация по названию (если search не пуст)
    if (search) {
      // При PostgreSQL используем ILIKE для регистронезависимого поиска
      qb.where('book.title ILIKE :search', { search: `%${search}%` });
      // Если нужно искать ещё и по copyInfo, добавляем .andWhere():
      // qb.andWhere('copy.copyInfo ILIKE :search', { search: `%${search}%` });
    }

    // Фильтрация "только доступные" = нет active-записи о выдаче (returnDate IS NULL)
    if (onlyAvailable) {
      qb.andWhere((qb2) => {
        const subQuery = qb2
          .subQuery()
          .select('1')
          .from('borrow_record', 'br')
          .where('br.bookCopyId = copy.id')
          .andWhere('br.returnDate IS NULL')
          .getQuery();
        return `NOT EXISTS ${subQuery}`;
      });
    }

    // Считаем общее количество до пагинации
    const total = await qb.getCount();

    // Применяем skip/take
    qb.skip((page - 1) * limit).take(limit);

    // Выполняем запрос
    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
    };
  }
}