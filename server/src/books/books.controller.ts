import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  Post,
  Body,
  Put,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { Book } from './book.entity';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  findAll(): Promise<Book[]> {
    return this.booksService.findAll();
  }

  // Поиск по какому-нибудь параметру
  @Get('find')
  async findBook(
    @Query('searchType') searchType: string,
    @Query('query') value: string,
  ): Promise<Book> {
    let foundBook: Book | null;

    switch (searchType) {
      case 'isbn':
        foundBook = await this.booksService.findOneByIsbn(value);
        break;
      default:
        throw new NotFoundException('Неверный тип поиска');
    }

    if (!foundBook) {
      throw new NotFoundException('Книга не найдена');
    }
    return foundBook;
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Book> {
    return this.booksService.findOneWithRelations(id);
  }

  @Post()
  create(@Body() data: Partial<Book>): Promise<Book> {
    return this.booksService.create(data);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Book>,
  ): Promise<Book | null> {
    return this.booksService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.booksService.remove(id);
  }
}