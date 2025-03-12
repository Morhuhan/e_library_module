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
    bookCopyId: number, // вместо bookId
    studentId: number,
    issuedByUserId: number,
  ): Promise<BorrowRecord> {
    const newRecord = this.borrowRecordRepository.create({
      // вместо book: { id: bookId }:
      bookCopy: { id: bookCopyId } as any,
      student: { id: studentId } as any,
      issuedByUser: { id: issuedByUserId } as any,
      borrowDate: new Date().toISOString().split('T')[0], // упрощённо
      returnDate: null,
    });

    return this.borrowRecordRepository.save(newRecord);
  }

  // Приём возврата (проставляем returnDate и acceptedByUser)
  async returnBook(recordId: number, acceptedByUserId: number): Promise<BorrowRecord> {
    const record = await this.borrowRecordRepository.findOne({
      where: { id: recordId },
      relations: ['bookCopy', 'student', 'issuedByUser', 'acceptedByUser'],
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
      relations: ['bookCopy', 'bookCopy.book', 'student', 'issuedByUser', 'acceptedByUser'],
    });
  }

  // Одна запись
  findOne(id: number): Promise<BorrowRecord> {
    return this.borrowRecordRepository.findOne({
      where: { id },
      relations: ['bookCopy', 'bookCopy.book', 'student', 'issuedByUser', 'acceptedByUser'],
    });
  }
}