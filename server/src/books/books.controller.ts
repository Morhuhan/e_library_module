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
  UseGuards,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { Book } from './book.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('books')
@UseGuards(AuthGuard('jwt'))
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get('find')
  async findBook(
    @Query('searchType') searchType: string,
    @Query('query') value: string,
  ): Promise<Book> {
    let foundBook: Book | null = null;

    switch (searchType) {
      case 'local_index':
        foundBook = await this.booksService.findOneByLocalIndex(value);
        break;

      default:
        throw new NotFoundException('Неверный тип поиска (searchType)');
    }

    if (!foundBook) {
      throw new NotFoundException('Книга не найдена');
    }
    return foundBook;
  }

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
  
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Book> {
    return this.booksService.findOneWithRelations(id);
  }

  @Post()
  create(@Body() data: Partial<Book>): Promise<Book> {
    return this.booksService.create(data);
  }

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

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.booksService.remove(id);
  }
}