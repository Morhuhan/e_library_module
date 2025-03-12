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
  
    // Получить все экземпляры
    @Get()
    findAll(): Promise<BookCopy[]> {
      return this.copiesService.findAll();
    }
  
    // Получить один экземпляр
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number): Promise<BookCopy | null> {
      return this.copiesService.findOne(id);
    }
  
    // Создать (добавить новый экземпляр)
    @Post()
    create(@Body() data: Partial<BookCopy>): Promise<BookCopy> {
      return this.copiesService.create(data);
    }
  
    // Обновить данные
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
  
    // Удалить
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
      return this.copiesService.remove(id);
    }
  
    // Пример поиска по инвентарному номеру
    @Get('find/by-inv')
    async findByInventory(@Query('invNumber') invNumber: string) {
      const copy = await this.copiesService.findByInventoryNumber(invNumber);
      if (!copy) {
        throw new NotFoundException('Экземпляр не найден');
      }
      return copy;
    }
  }