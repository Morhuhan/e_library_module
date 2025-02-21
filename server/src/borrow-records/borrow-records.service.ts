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
    bookId: number,
    studentId: number,
    issuedByUserId: number,
  ): Promise<BorrowRecord> {
    const newRecord = this.borrowRecordRepository.create({
      // book, student, issuedByUser — связаны с другими сущностями,
      // поэтому достаточно указать их ID (через "as any") или вручную.
      book: { id: bookId } as any,
      student: { id: studentId } as any,
      issuedByUser: { id: issuedByUserId } as any,

      borrowDate: new Date().toISOString().split('T')[0],
      returnDate: null,
      // acceptedByUser оставим null, пока книгу не вернули
    });

    return this.borrowRecordRepository.save(newRecord);
  }

  // Обновление записи о возврате (проставляем returnDate и acceptedByUser)
  async returnBook(recordId: number, acceptedByUserId: number): Promise<BorrowRecord> {
    const record = await this.borrowRecordRepository.findOne({
      where: { id: recordId },
      relations: ['book', 'student', 'issuedByUser', 'acceptedByUser'],
    });
    if (!record) {
      throw new Error('Запись о выдаче не найдена');
    }

    record.returnDate = new Date().toISOString().split('T')[0];
    record.acceptedByUser = { id: acceptedByUserId } as any;

    return this.borrowRecordRepository.save(record);
  }

  // Получить все записи
  findAll(): Promise<BorrowRecord[]> {
    return this.borrowRecordRepository.find({
      relations: ['book', 'student', 'issuedByUser', 'acceptedByUser'],
    });
  }

  // Получить конкретную запись по id
  findOne(id: number): Promise<BorrowRecord> {
    return this.borrowRecordRepository.findOne({
      where: { id },
      relations: ['book', 'student', 'issuedByUser', 'acceptedByUser'],
    });
  }
}