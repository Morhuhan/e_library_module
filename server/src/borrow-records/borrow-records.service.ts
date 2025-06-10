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
      person: { id: personId } as any,
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
    if (!record) {
      throw new Error('Запись о выдаче не найдена');
    }

    record.returnDate = new Date().toISOString().split('T')[0];
    record.acceptedByUser = { id: acceptedByUserId } as any;

    return this.borrowRecordRepository.save(record);
  }

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
    const qb = this.borrowRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.bookCopy', 'bookCopy')
      .leftJoinAndSelect('bookCopy.book', 'book')
      .leftJoinAndSelect('record.person', 'person')
      .leftJoinAndSelect('record.issuedByUser', 'issuedByUser')
      .leftJoinAndSelect('record.acceptedByUser', 'acceptedByUser');

    if (onlyDebts) {
      qb.andWhere('record.returnDate IS NULL');
    }

    if (search) {
      qb.andWhere('LOWER(person.lastName) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }
}