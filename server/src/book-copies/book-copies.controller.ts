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
} from '@nestjs/common';
import { BookCopiesService } from './book-copies.service';
import { BookCopy } from './book-copy.entity';

@Controller('book-copies')
export class BookCopiesController {
  constructor(private readonly copiesService: BookCopiesService) {}

  // Получить все экземпляры (старый метод, без пагинации)
  @Get()
  findAll(): Promise<BookCopy[]> {
    return this.copiesService.findAll();
  }

  // Получить один экземпляр по ID
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<BookCopy | null> {
    return this.copiesService.findOne(id);
  }

  // Создать новый экземпляр
  @Post()
  create(@Body() data: Partial<BookCopy>): Promise<BookCopy> {
    return this.copiesService.create(data);
  }

  // Обновить экземпляр
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

  // Удалить экземпляр
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.copiesService.remove(id);
  }

  // Пример: поиск по copyInfo
  @Get('find/by-info')
  async findByCopyInfo(@Query('info') info: string) {
    const copy = await this.copiesService.findByCopyInfo(info);
    if (!copy) {
      throw new NotFoundException('Экземпляр не найден');
    }
    return copy;
  }

  // === ВАЖНО: метод для пагинации ===
  @Get('paginated')
  async getPaginated(
    @Query('search') search: string,
    @Query('onlyAvailable') onlyAvailable: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
  ) {
    // Приводим onlyAvailable к boolean (приходит строка 'true'/'false')
    const onlyAvailableBool = onlyAvailable === 'true';

    return this.copiesService.findPaginated(search, onlyAvailableBool, page, limit);
  }
}