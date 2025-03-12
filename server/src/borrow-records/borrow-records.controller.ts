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
import { BorrowRecordsService } from './borrow-records.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('borrow-records')
@UseGuards(AuthGuard('jwt'))
export class BorrowRecordsController {
  constructor(private readonly borrowRecordsService: BorrowRecordsService) {}

  // Создаем запись о выдаче (bookCopyId вместо bookId)
  @Post()
  async createBorrowRecord(
    @Body('bookCopyId') bookCopyId: number,
    @Body('studentId') studentId: number,
    @Request() req: any,
  ) {
    const userId = req.user.userId; // ID текущего залогиненного пользователя
    return this.borrowRecordsService.createBorrowRecord(bookCopyId, studentId, userId);
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

  @Get()
  async findAllBorrowRecords() {
    return this.borrowRecordsService.findAll();
  }
}