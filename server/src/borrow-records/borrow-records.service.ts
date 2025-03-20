import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BorrowRecord } from './borrow-record.entity';

@Injectable()
export class BorrowRecordsService {
  constructor(
    @InjectRepository(BorrowRecord)
    private readonly borrowRecordRepository: Repository<BorrowRecord>,
  ) {}

  // Создание записи о выдаче книги
  async createBorrowRecord(
    bookCopyId: number,
    personId: number,    
    issuedByUserId: number,
  ): Promise<BorrowRecord> {
    const newRecord = this.borrowRecordRepository.create({
      bookCopy: { id: bookCopyId } as any,
      person: { id: personId } as any,
      issuedByUser: { id: issuedByUserId } as any,
      borrowDate: new Date().toISOString().split('T')[0],
      returnDate: null,
    });

    return this.borrowRecordRepository.save(newRecord);
  }

  // Приём возврата (проставляем returnDate и acceptedByUser)
  async returnBook(recordId: number, acceptedByUserId: number): Promise<BorrowRecord> {
    const record = await this.borrowRecordRepository.findOne({
      where: { id: recordId },
      relations: ['bookCopy', 'person', 'issuedByUser', 'acceptedByUser'],
    });
    if (!record) {
      throw new Error('Запись о выдаче не найдена');
    }

    record.returnDate = new Date().toISOString().split('T')[0];
    record.acceptedByUser = { id: acceptedByUserId } as any;

    return this.borrowRecordRepository.save(record);
  }

  // Все записи (без пагинации)
  findAll(): Promise<BorrowRecord[]> {
    return this.borrowRecordRepository.find({
      relations: ['bookCopy', 'bookCopy.book', 'person', 'issuedByUser', 'acceptedByUser'],
    });
  }

  // Одна запись
  findOne(id: number): Promise<BorrowRecord> {
    return this.borrowRecordRepository.findOne({
      where: { id },
      relations: ['bookCopy', 'bookCopy.book', 'person', 'issuedByUser', 'acceptedByUser'],
    });
  }

  // ========== ПАГИНАЦИЯ ========== 
  // Пример сигнатуры: findAllPaginated(search: string, onlyDebts: boolean, page: number, limit: number)
  async findAllPaginated(
    search: string,
    onlyDebts: boolean,
    page: number,
    limit: number,
  ): Promise<{
    data: BorrowRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Строим QueryBuilder для гибкой фильтрации
    const qb = this.borrowRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.bookCopy', 'bookCopy')
      .leftJoinAndSelect('bookCopy.book', 'book')
      .leftJoinAndSelect('record.person', 'person')
      .leftJoinAndSelect('record.issuedByUser', 'issuedByUser')
      .leftJoinAndSelect('record.acceptedByUser', 'acceptedByUser');

    // Если onlyDebts = true, показываем только те, у которых returnDate IS NULL
    if (onlyDebts) {
      qb.andWhere('record.returnDate IS NULL');
    }

    // Поиск (search) — например, по фамилии человека
    if (search) {
      // LOWER(person.lastName) LIKE :search
      qb.andWhere('LOWER(person.lastName) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    // Пагинация
    qb.skip((page - 1) * limit).take(limit);

    // Выполняем запрос
    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }
}