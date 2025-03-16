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
    personId: number,          // <-- заменили studentId на personId
    issuedByUserId: number,
  ): Promise<BorrowRecord> {
    const newRecord = this.borrowRecordRepository.create({
      bookCopy: { id: bookCopyId } as any,
      person: { id: personId } as any,    // <-- ссылка на Person
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

  // Все записи
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
}