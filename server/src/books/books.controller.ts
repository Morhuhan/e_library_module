import {
  Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseBoolPipe, ParseIntPipe,
  Post, Put, Query, UseGuards, ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BooksService } from './books.service';
import { Book } from './book.entity';
import { UpdateBookDto } from './update-book.dto';

@Controller('books')
@UseGuards(AuthGuard('jwt'))
export class BooksController {
  constructor(private readonly books: BooksService) {}

  /* -------- public endpoints -------- */
  @Get('paginated')
  getPaginated(
    @Query('search')         search       = '',
    @Query('searchColumn')   searchColumn = '',
    @Query('onlyAvailable',  new DefaultValuePipe(false), ParseBoolPipe)
                            onlyAvailable: boolean,
    @Query('onlyIssued',     new DefaultValuePipe(false), ParseBoolPipe)
                            onlyIssued:   boolean,
    @Query('page',   new DefaultValuePipe(1),  ParseIntPipe) page  : number,
    @Query('limit',  new DefaultValuePipe(10), ParseIntPipe) limit : number,
    @Query('sort')           sort         = '',
  ) {
    return this.books.findPaginated(
      search, searchColumn, onlyAvailable, onlyIssued, page, limit, sort,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.books.findOneWithRelations(id);
  }

  @Post()
  create(@Body(new ValidationPipe({ whitelist: true })) dto: Partial<Book>) {
    return this.books.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true })) dto: UpdateBookDto,
  ) {
    return this.books.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.books.remove(id);
  }
}