// book-copies.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookCopiesService } from './book-copies.service';
import { BookCopy } from './book-copy.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('book-copies')
@UseGuards(AuthGuard('jwt'))
export class BookCopiesController {
  constructor(private readonly copiesService: BookCopiesService) {}

  @Get()
  findAll(): Promise<BookCopy[]> {
    return this.copiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<BookCopy | null> {
    return this.copiesService.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<BookCopy>): Promise<BookCopy> {
    return this.copiesService.create(data);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<BookCopy>,
  ): Promise<BookCopy | null> {
    const updated = await this.copiesService.update(id, data);
    if (!updated) {
      throw new NotFoundException('Экземпляр не найден');
    }
    return updated;
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.copiesService.remove(id);
  }

  @Get('find/by-inventory')
  async findByInventoryNo(@Query('number') number: string) {
    const copy = await this.copiesService.findByInventoryNo(number);
    if (!copy) {
      throw new NotFoundException('Экземпляр не найден');
    }
    return copy;
  }

  @Get('paginated')
  async getPaginated(
    @Query('search') search: string,
    @Query('onlyAvailable') onlyAvailable: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
  ) {
    const onlyAvailableBool = onlyAvailable === 'true';
    return this.copiesService.findPaginated(search, onlyAvailableBool, page, limit);
  }
}