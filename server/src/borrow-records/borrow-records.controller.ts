// borrow-records.controller.ts
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
  Query,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BorrowRecordsService } from './borrow-records.service';

@Controller('borrow-records')
@UseGuards(AuthGuard('jwt'))
export class BorrowRecordsController {
  constructor(private readonly borrowRecordsService: BorrowRecordsService) {}

  @Post()
  async createBorrowRecord(
    @Body('bookCopyId') bookCopyId: number,
    @Body('personId') personId: number,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    return this.borrowRecordsService.createBorrowRecord(bookCopyId, personId, userId);
  }

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

  @Get('paginated')
  async findAllPaginated(
    @Query('search') search = '',
    @Query('searchColumn') searchColumn = '',
    @Query('onlyDebts', new DefaultValuePipe(false), ParseBoolPipe) onlyDebts: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sort') sort = '',
  ) {
    return this.borrowRecordsService.findAllPaginated(
      search,
      searchColumn,
      onlyDebts,
      page,
      limit,
      sort,
    );
  }
}