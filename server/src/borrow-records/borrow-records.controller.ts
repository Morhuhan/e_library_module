import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BorrowRecordsService } from './borrow-records.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('borrow-records')
@UseGuards(AuthGuard('jwt'))
export class BorrowRecordsController {
  constructor(private readonly borrowRecordsService: BorrowRecordsService) {}

  // Создаем запись о выдаче книги
  @Post()
  async createBorrowRecord(
    @Body('bookId') bookId: number,
    @Body('studentId') studentId: number,
    @Request() req: any,
  ) {
    // userId — это ID текущего залогиненного пользователя,
    // который "выдаёт" книгу
    const userId = req.user.userId;
    return this.borrowRecordsService.createBorrowRecord(bookId, studentId, userId);
  }

  // Возврат книги (проставляем дату возврата и acceptedByUser)
  @Patch(':id/return')
  async returnBook(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    // userId — это ID текущего пользователя, который "принимает" книгу
    const userId = req.user.userId;
    return this.borrowRecordsService.returnBook(id, userId);
  }
}