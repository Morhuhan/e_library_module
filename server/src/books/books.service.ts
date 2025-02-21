// src/books/books.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from './book.entity';
import { Like, ILike, Repository } from 'typeorm';

// books.service.ts
@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) {}

  async findAll(): Promise<Book[]> {
    return this.bookRepository.find({
      relations: ['borrowRecords'],
    });
  }


  async findOneWithRelations(id: number): Promise<Book> {
    return this.bookRepository.findOne({
      where: { id },
      relations: [
        'borrowRecords',
        'borrowRecords.student',
        'borrowRecords.issuedByUser',
        'borrowRecords.acceptedByUser',
      ],
    });
  }
  
  async findOneByIsbn(isbn: string): Promise<Book | null> {
    return this.bookRepository.findOne({
      where: { isbn },
      relations: [
        'borrowRecords',
        'borrowRecords.student',
        'borrowRecords.issuedByUser',
        'borrowRecords.acceptedByUser',
      ],
    });
  }
  
  async findOneByLocalNumber(localNumber: string): Promise<Book | null> {
    return this.bookRepository.findOne({
      where: { localNumber },
      relations: [
        'borrowRecords',
        'borrowRecords.student',
        'borrowRecords.issuedByUser',
        'borrowRecords.acceptedByUser',
      ],
    });
  }
}