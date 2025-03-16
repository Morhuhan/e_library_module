import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BorrowRecordsService } from './borrow-records.service';

@Controller('borrow-records')
@UseGuards(AuthGuard('jwt'))
export class BorrowRecordsController {
  constructor(private readonly borrowRecordsService: BorrowRecordsService) {}

  // Создаем запись о выдаче
  @Post()
  async createBorrowRecord(
    @Body('bookCopyId') bookCopyId: number,
    @Body('personId') personId: number,       // <-- вместо studentId
    @Request() req: any,
  ) {
    const userId = req.user.userId; // ID текущего залогиненного пользователя
    return this.borrowRecordsService.createBorrowRecord(bookCopyId, personId, userId);
  }

  // Возврат книги
  @Patch(':id/return')
  async returnBook(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    return this.borrowRecordsService.returnBook(id, userId);
  }

  // Получить все записи
  @Get()
  async findAllBorrowRecords() {
    return this.borrowRecordsService.findAll();
  }
}