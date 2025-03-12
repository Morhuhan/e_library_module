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

  findAll(): Promise<BookCopy[]> {
    return this.bookCopyRepository.find({
      relations: ['book', 'borrowRecords'],
    });
  }

  findOne(id: number): Promise<BookCopy | null> {
    return this.bookCopyRepository.findOne({
      where: { id },
      relations: ['book', 'borrowRecords'],
    });
  }

  // Создать экземпляр, указав bookId и нужные поля
  async create(data: Partial<BookCopy>): Promise<BookCopy> {
    const copy = this.bookCopyRepository.create(data);
    return this.bookCopyRepository.save(copy);
  }

  // Обновить
  async update(id: number, data: Partial<BookCopy>): Promise<BookCopy | null> {
    await this.bookCopyRepository.update(id, data);
    return this.findOne(id);
  }

  // Удалить
  async remove(id: number): Promise<void> {
    await this.bookCopyRepository.delete(id);
  }

  // Поиск по инвентарному номеру
  findByInventoryNumber(invNumber: string): Promise<BookCopy | null> {
    return this.bookCopyRepository.findOne({
      where: { inventoryNumber: invNumber },
      relations: ['book', 'borrowRecords'],
    });
  }
}