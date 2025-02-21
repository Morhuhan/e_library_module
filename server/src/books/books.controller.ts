// books.controller.ts

import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { BooksService } from './books.service';
import { Book } from './book.entity';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  // Прежний метод, возвращающий все книги
  @Get()
  findAll(): Promise<Book[]> {
    return this.booksService.findAll();
  }

  // Новый эндпоинт, который будет отвечать на /books/find
  @Get('find')
  async findBook(
    @Query('searchType') searchType: string,
    @Query('query') value: string,
  ): Promise<Book> {
    // Логика поиска по разным полям
    let foundBook: Book | null;

    switch (searchType) {
      case 'isbn':
        foundBook = await this.booksService.findOneByIsbn(value);
        break;
      case 'localNumber':
        foundBook = await this.booksService.findOneByLocalNumber(value);
        break;
      default:
        // Можно выбросить ошибку или вернуть null
        throw new NotFoundException('Неверный тип поиска');
    }

    if (!foundBook) {
      throw new NotFoundException('Книга не найдена');
    }

    return foundBook;
  }

  // Прежний метод, возвращающий книгу по id
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Book> {
    return this.booksService.findOneWithRelations(Number(id));
  }
}