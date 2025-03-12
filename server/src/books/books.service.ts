import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './book.entity';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) {}

  // Получить все "книги" (библиографические данные), 
  // включая связи с "bookCopies" (экземплярами)
  findAll(): Promise<Book[]> {
    return this.bookRepository.find({
      relations: ['bookCopies'],
    });
  }

  // Получить книгу по ID (и список её экземпляров)
  findOneWithRelations(id: number): Promise<Book> {
    return this.bookRepository.findOne({
      where: { id },
      relations: ['bookCopies'],
    });
  }

  // Создать (пример)
  async create(data: Partial<Book>): Promise<Book> {
    const book = this.bookRepository.create(data);
    return this.bookRepository.save(book);
  }

  // Обновить
  async update(id: number, data: Partial<Book>): Promise<Book | null> {
    await this.bookRepository.update(id, data);
    return this.findOneWithRelations(id);
  }

  // Удалить
  async remove(id: number): Promise<void> {
    await this.bookRepository.delete(id);
  }

  // Поиск по ISBN, если нужно
  async findOneByIsbn(isbn: string): Promise<Book | null> {
    return this.bookRepository.findOne({
      where: { isbn },
      relations: ['bookCopies'],
    });
  }
}