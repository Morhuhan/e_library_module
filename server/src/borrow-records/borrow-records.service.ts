// borrow-records.service.ts
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

  /* ------------------------------------------------------------------ */
  /*                        СОЗДАНИЕ / ВОЗВРАТ                           */
  /* ------------------------------------------------------------------ */

  async createBorrowRecord(
    bookCopyId: number,
    personId: number,
    issuedByUserId: number,
  ): Promise<BorrowRecord> {
    const today = new Date();
    const expectedReturn = new Date(today);
    expectedReturn.setFullYear(expectedReturn.getFullYear() + 1);

    const newRecord = this.borrowRecordRepository.create({
      bookCopy: { id: bookCopyId } as any,
      person:   { id: personId }   as any,
      issuedByUser: { id: issuedByUserId } as any,
      borrowDate: today.toISOString().split('T')[0],
      expectedReturnDate: expectedReturn.toISOString().split('T')[0],
      returnDate: null,
    });

    return this.borrowRecordRepository.save(newRecord);
  }

  async returnBook(recordId: number, acceptedByUserId: number): Promise<BorrowRecord> {
    const record = await this.borrowRecordRepository.findOne({
      where: { id: recordId },
      relations: ['bookCopy', 'person', 'issuedByUser', 'acceptedByUser'],
    });
    if (!record) throw new Error('Запись о выдаче не найдена');

    record.returnDate = new Date().toISOString().split('T')[0];
    record.acceptedByUser = { id: acceptedByUserId } as any;
    return this.borrowRecordRepository.save(record);
  }

  /* ------------------------------------------------------------------ */
  /*                            ГЕТТЕРЫ                                  */
  /* ------------------------------------------------------------------ */

  findAll(): Promise<BorrowRecord[]> {
    return this.borrowRecordRepository.find({
      relations: [
        'bookCopy',
        'bookCopy.book',
        'person',
        'issuedByUser',
        'acceptedByUser',
      ],
    });
  }

  findOne(id: number): Promise<BorrowRecord> {
    return this.borrowRecordRepository.findOne({
      where: { id },
      relations: [
        'bookCopy',
        'bookCopy.book',
        'person',
        'issuedByUser',
        'acceptedByUser',
      ],
    });
  }

  /* ------------------------------------------------------------------ */
  /*                ПАГИНАЦИЯ / ПОИСК / СОРТИРОВКА                        */
  /* ------------------------------------------------------------------ */

  async findAllPaginated(
    search: string,
    searchColumn: string,
    onlyDebts: boolean,
    page: number,
    limit: number,
    sort: string,
  ): Promise<{ data: BorrowRecord[]; total: number; page: number; limit: number }> {
    const qb = this.borrowRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.bookCopy', 'bookCopy')
      .leftJoinAndSelect('bookCopy.book', 'book')
      .leftJoinAndSelect('record.person', 'person')
      .leftJoinAndSelect('record.issuedByUser', 'issuedByUser')
      .leftJoinAndSelect('record.acceptedByUser', 'acceptedByUser');

    if (onlyDebts) qb.andWhere('record.return_date IS NULL');

    /* ---------- поиск ---------- */
    const colMap: Record<string, string> = {
      title:              'book.title',
      inventoryNo:        'bookCopy.inventoryNo',
      person:             "concat_ws(' ', person.last_name, person.first_name, person.patronymic)",
      borrowDate:         'record.borrowDate',
      expectedReturnDate: 'record.expectedReturnDate',
      returnDate:         'record.returnDate',
      issuedByUser:       'issuedByUser.username',
      acceptedByUser:     'acceptedByUser.username',
    };

    if (search) {
      if (searchColumn && colMap[searchColumn]) {
        qb.andWhere(`${colMap[searchColumn]} ILIKE :searchExact`, {
          searchExact: `%${search}%`,
        });
      } else {
        qb.andWhere(
          `(book.title ILIKE :s
          OR bookCopy.inventory_no ILIKE :s
          OR concat_ws(' ', person.last_name, person.first_name, person.patronymic) ILIKE :s
          OR record.borrow_date::text ILIKE :s
          OR record.expected_return_date::text ILIKE :s
          OR record.return_date::text ILIKE :s
          OR issuedByUser.username ILIKE :s
          OR acceptedByUser.username ILIKE :s)`,
          { s: `%${search}%` },
        );
      }
    }

    /* ---------- сортировка ---------- */
    const allowedSorts: Record<string, { expr: string; type: 'text' | 'date' }> = {
      title:              { expr: 'book.title',                       type: 'text' },
      inventoryNo:        { expr: 'bookCopy.inventoryNo',             type: 'text' },
      person:             { expr: "concat_ws(' ', person.last_name, person.first_name, person.patronymic)", type: 'text' },
      borrowDate:         { expr: 'record.borrowDate',                type: 'date' },
      expectedReturnDate: { expr: 'record.expectedReturnDate',        type: 'date' },
      returnDate:         { expr: 'record.returnDate',                type: 'date' },
      issuedByUser:       { expr: 'issuedByUser.username',            type: 'text' },
      acceptedByUser:     { expr: 'acceptedByUser.username',          type: 'text' },
    };

    if (sort) {
      const [field, orderRaw] = sort.split('.');
      const direction = orderRaw === 'desc' ? 'DESC' : 'ASC';

      if (allowedSorts[field]) {
        const { expr, type } = allowedSorts[field];

        if (type === 'text') {
          const orderAlias = `${field}_order`.toLowerCase();
          qb.addSelect(`LOWER(${expr})`, orderAlias);
          qb.addOrderBy(orderAlias, direction, 'NULLS LAST');
        } else {
          qb.addOrderBy(expr, direction, 'NULLS LAST');
        }
      } else {
        qb.addOrderBy('record.id', 'ASC', 'NULLS LAST');
      }
    } else {
      qb.addOrderBy('record.id', 'ASC', 'NULLS LAST');
    }

    /* ---------- пагинация ---------- */
    qb.skip((page - 1) * limit).take(limit);

    /* ---------- логируем SQL ---------- */

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}