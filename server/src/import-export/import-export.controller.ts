// src/import-export/import-export.controller.ts

import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportExportService } from './import-export.service';
import { Response } from 'express';

@Controller('import-export')
@UseGuards(AuthGuard('jwt'))
export class ImportExportController {
  private readonly logger = new Logger(ImportExportController.name);

  constructor(private readonly svc: ImportExportService) {}

  /* ========== ИМПОРТ КНИГ ========== */
  @Post('books')
  @UseInterceptors(FileInterceptor('file'))
  async importBooks(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      this.logger.warn('Попытка импорта книг без файла');
      throw new BadRequestException('Excel-файл не найден');
    }
    this.logger.log(`Импорт книг. Получен файл: "${file.originalname}", размер: ${file.size} байт`);
    const result = await this.svc.importBooks(file.path);
    this.logger.log(`Импорт книг завершён. Создано: ${result.created}, обновлено: ${result.updated}`);
    return result;
  }

  /* ========== ИМПОРТ ЭКЗЕМПЛЯРОВ ========== */
  @Post('copies')
  @UseInterceptors(FileInterceptor('file'))
  async importCopies(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      this.logger.warn('Попытка импорта экземпляров без файла');
      throw new BadRequestException('Excel-файл не найден');
    }
    this.logger.log(`Импорт экземпляров. Получен файл: "${file.originalname}", размер: ${file.size} байт`);
    const result = await this.svc.importCopies(file.path);
    this.logger.log(`Импорт экземпляров завершён. Создано: ${result.created}, пропущено: ${result.skipped}`);
    return result;
  }

  /* ========== ЭКСПОРТ КНИГ ========== */
  @Get('books')
  async exportBooks(
    @Query('limit', new DefaultValuePipe(0), ParseIntPipe) limit: number,
    @Res() res: any,
  ) {
    this.logger.log(`Экспорт книг (limit=${limit})`);
    const buffer = await this.svc.exportBooks(limit);
    this.logger.log(`Экспорт книг: получен XLSX, размер ~${buffer.byteLength} байт`);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="books-${new Date().toISOString().slice(0,10)}.xlsx"`,
    });

    return res.end(buffer);
  }

  /* ========== ЭКСПОРТ ЭКЗЕМПЛЯРОВ ========== */
  @Get('copies')
  async exportCopies(
    @Query('limit', new DefaultValuePipe(0), ParseIntPipe) limit: number,
    @Res() res: any,
  ) {
    this.logger.log(`Экспорт экземпляров (limit=${limit})`);
    const buffer = await this.svc.exportCopies(limit);
    this.logger.log(`Экспорт экземпляров: получен XLSX, размер ~${buffer.byteLength} байт`);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="copies-${new Date().toISOString().slice(0,10)}.xlsx"`,
    });

    return res.end(buffer);
  }

  /* ========== ШАБЛОН ДЛЯ ИМПОРТА КНИГ/ЭКЗЕМПЛЯРОВ ========== */

  @Get('books/template')
  async downloadBooksTemplate(@Res() res: Response) {
    const buffer = await this.svc.makeBooksTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="books-template.xlsx"',
    });
    return res.end(buffer);
  }

  @Get('copies/template')
  async downloadCopiesTemplate(@Res() res: Response) {
    const buffer = await this.svc.makeCopiesTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="copies-template.xlsx"',
    });
    return res.end(buffer);
  }
}