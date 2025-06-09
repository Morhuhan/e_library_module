// src/reports/reports.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BorrowRecord } from '../borrow-records/borrow-record.entity';
import { Repository } from 'typeorm';
import { Book } from '../books/book.entity';
import { Person } from '../persons/person.entity';
import { BookCopy } from '../book-copies/book-copy.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(BorrowRecord)
    private readonly borrowRecordRepo: Repository<BorrowRecord>,

    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,

    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,

    @InjectRepository(BookCopy)
    private readonly bookCopyRepo: Repository<BookCopy>,
  ) {}

  /**
   * 1) Все не возвращённые (returnDate IS NULL).
   *    Возвращаем именно те поля, которые вам нужны в отчёте:
   *    ID, Название, Экземпляр, Читатель, Дата выдачи, Дата возврата, Кто выдал, Кто принял
   */
  async getUnreturned() {
    return this.borrowRecordRepo
      .createQueryBuilder('br')
      .leftJoin('br.bookCopy', 'bc')
      .leftJoin('bc.book', 'b')
      .leftJoin('br.person', 'p')
      .leftJoin('br.issuedByUser', 'iu')
      .leftJoin('br.acceptedByUser', 'au')
      .select([
        'br.id AS "id"',
        'b.title AS "bookTitle"',
        'bc.copyInfo AS "copyInfo"',
        `CONCAT(p.lastName, ' ', p.firstName, ' ', COALESCE(p.patronymic, '')) AS "personFullName"`,
        'br.borrowDate AS "borrowDate"',
        'br.returnDate AS "returnDate"',
        'iu.username AS "issuedByUsername"',
        'au.username AS "acceptedByUsername"',
      ])
      .where('br.returnDate IS NULL')
      .orderBy('br.borrowDate', 'DESC')
      .getRawMany();
  }

  /**
   * 2) Все "просроченные".
   *    Поскольку нет поля due_date, определим логику сами:
   *    Например, считаем "просроченным" всё, что взято 30+ дней назад и не возвращено.
   */
  async getOverdue() {
    // Берём дату 30 дней назад
    const DAYS_AGO = 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DAYS_AGO);

    return this.borrowRecordRepo
      .createQueryBuilder('br')
      .leftJoin('br.bookCopy', 'bc')
      .leftJoin('bc.book', 'b')
      .leftJoin('br.person', 'p')
      .leftJoin('br.issuedByUser', 'iu')
      .leftJoin('br.acceptedByUser', 'au')
      .select([
        'br.id AS "id"',
        'b.title AS "bookTitle"',
        'bc.copyInfo AS "copyInfo"',
        `CONCAT(p.lastName, ' ', p.firstName, ' ', COALESCE(p.patronymic, '')) AS "personFullName"`,
        'br.borrowDate AS "borrowDate"',
        'br.returnDate AS "returnDate"',
        'iu.username AS "issuedByUsername"',
        'au.username AS "acceptedByUsername"',
      ])
      .where('br.returnDate IS NULL')
      .andWhere('br.borrowDate < :cutoff', { cutoff })
      .orderBy('br.borrowDate', 'ASC')
      .getRawMany();
  }

  /**
   * 3) Топ-10 популярных книг (по количеству всех выдач).
   */
  async getPopular() {
    return this.bookRepo
      .createQueryBuilder('b')
      .select('b.id', 'id')
      .addSelect('b.title', 'title')
      .addSelect('COUNT(br.id)', 'borrowCount')
      .leftJoin('b.bookCopies', 'bc')
      .leftJoin('bc.borrowRecords', 'br')
      .groupBy('b.id')
      .orderBy('COUNT(br.id)', 'DESC')
      .limit(10)
      .getRawMany();
    /*
      Пример результата:
      [
        { id: 1, title: 'Название', borrowCount: '12' },
        ...
      ]
    */
  }

  /**
   * 4) Топ-10 самых активных читателей (по количеству выдач).
   *    У Person в вашем коде нет связи "borrowRecords",
   *    поэтому используем manual left join на borrow_record c условием on br.person_id = p.id
   */
  async getActiveReaders() {
    return this.personRepo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .addSelect(
        `CONCAT(p.lastName, ' ', p.firstName, ' ', COALESCE(p.patronymic, ''))`,
        'fullName',
      )
      .addSelect('COUNT(br.id)', 'borrowCount')
      .leftJoin(BorrowRecord, 'br', 'br.person_id = p.id')
      .groupBy('p.id')
      .orderBy('COUNT(br.id)', 'DESC')
      .limit(10)
      .getRawMany();
  }


  async getBooksWithoutCopies() {
    return this.bookRepo
      .createQueryBuilder('b')
      .leftJoin(BookCopy,   'bc',  'bc.book_id = b.id')
      .leftJoin(
        BorrowRecord,
        'abr',
        'abr.book_copy_id = bc.id AND abr.return_date IS NULL',
      )
      .select('b.id',      'id')
      .addSelect('b.title','bookTitle')
      .addSelect('COUNT(DISTINCT bc.id)',                 'copiesCount')
      .addSelect('COUNT(DISTINCT abr.book_copy_id)',      'borrowedNow')
      .addSelect(`
        CASE
          WHEN COUNT(DISTINCT bc.id) = 0
            THEN 'списаны'
          ELSE 'выданы'
        END
      `, 'reason')
      .groupBy('b.id')
      .having(`
        COUNT(DISTINCT bc.id) = 0
        OR COUNT(DISTINCT bc.id) = COUNT(DISTINCT abr.book_copy_id)
      `)
      .orderBy('b.title', 'ASC')
      .getRawMany();
  }
}