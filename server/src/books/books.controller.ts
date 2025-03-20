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
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { Book } from './book.entity';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  /**
   * ===== Универсальный поиск (например, по localIndex) =====
   *
   * Пример запроса:
   *   GET /books/find?searchType=local_index&query=42%2FД72-653368
   *
   * Обратите внимание на encodeURIComponent (слэш `/` преобразуется в `%2F`).
   */
  @Get('find')
  async findBook(
    @Query('searchType') searchType: string,
    @Query('query') value: string,
  ): Promise<Book> {
    let foundBook: Book | null = null;

    // Смотрите, какой именно параметр вы ждёте: 'local_index' или 'localIndex' —
    // главное, чтобы в фронтенде и бэкенде совпадало.
    switch (searchType) {
      case 'local_index':
        // Поиск по полю localIndex
        foundBook = await this.booksService.findOneByLocalIndex(value);
        break;

      // Можно добавить и другие кейсы поиска:
      // case 'title':
      //   foundBook = await this.booksService.findOneByTitle(value);
      //   break;

      default:
        throw new NotFoundException('Неверный тип поиска (searchType)');
    }

    if (!foundBook) {
      throw new NotFoundException('Книга не найдена');
    }
    return foundBook;
  }

  // Получить все книги
  @Get()
  findAll(): Promise<Book[]> {
    return this.booksService.findAll();
  }

  @Get('paginated')
  async getPaginated(
    @Query('search') search: string = '',
    @Query('onlyAvailable', new DefaultValuePipe(false), ParseBoolPipe) onlyAvailable: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<{
    data: Book[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.booksService.findPaginated(search, onlyAvailable, page, limit);
  }
  
  // Получить одну книгу по ID
  // Здесь ParseIntPipe, значит этот метод вызовется,
  // только если books/:id — это действительно число
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Book> {
    return this.booksService.findOneWithRelations(id);
  }

  // Создать книгу
  @Post()
  create(@Body() data: Partial<Book>): Promise<Book> {
    return this.booksService.create(data);
  }

  // Обновить книгу
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Book>,
  ): Promise<Book> {
    const updated = await this.booksService.update(id, data);
    if (!updated) {
      throw new NotFoundException('Книга не найдена');
    }
    return updated;
  }

  // Удалить книгу
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.booksService.remove(id);
  }
}