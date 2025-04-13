// src/import-export/import-export.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { BooksService } from '../books/books.service';
import { BookCopiesService } from '../book-copies/book-copies.service';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs/promises';

@Injectable()
export class ImportExportService {
  private readonly logger = new Logger(ImportExportService.name);

  constructor(
    private readonly booksService: BooksService,
    private readonly copiesService: BookCopiesService,
  ) {}

  /* ========== ИМПОРТ КНИГ ========== */
  async importBooks(filePath: string) {
    this.logger.debug(`importBooks: загрузили файл "${filePath}" во временную папку`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // Удаляем файл после чтения
    await fs.unlink(filePath).catch((err) => {
      this.logger.warn(`Ошибка при удалении "${filePath}": ${err.message}`);
    });

    const sheet = workbook.getWorksheet('books');
    if (!sheet) {
      this.logger.warn('В файле нет вкладки "books"');
      return { created: 0, updated: 0, message: 'No "books" sheet found' };
    }

    let created = 0;
    let updated = 0;
    const totalRows = sheet.rowCount;

    // Проходим по строкам
    for (let rowIndex = 2; rowIndex <= totalRows; rowIndex++) {
      const row = sheet.getRow(rowIndex);

      const localIndex = (row.getCell(1).value ?? '').toString().trim();
      const title      = (row.getCell(2).value ?? '').toString().trim();
      const authors    = (row.getCell(3).value ?? '').toString().trim();
      const bookType   = (row.getCell(4).value ?? '').toString().trim();
      const udc        = (row.getCell(5).value ?? '').toString().trim();
      const bbk        = (row.getCell(6).value ?? '').toString().trim();

      if (!localIndex) continue; // пропустим пустую или невалидную строку

      try {
        // Ищем книгу с таким localIndex
        const existing = await this.booksService.findOneByLocalIndex(localIndex);
        if (existing) {
          // Обновляем
          existing.title    = title    || existing.title;
          existing.authors  = authors  || existing.authors;
          existing.bookType = bookType || existing.bookType;
          existing.udc      = udc      || existing.udc;
          existing.bbk      = bbk      || existing.bbk;
          await this.booksService.update(existing.id, existing);
          updated++;
        } else {
          // Создаём
          await this.booksService.create({
            localIndex,
            title,
            authors,
            bookType,
            udc,
            bbk,
          });
          created++;
        }
      } catch (err) {
        this.logger.error(
          `Ошибка в строке #${rowIndex}, localIndex="${localIndex}": ${err.message}`,
        );
      }
    }

    return { created, updated };
  }

  /* ========== ИМПОРТ ЭКЗЕМПЛЯРОВ ========== */
  async importCopies(filePath: string) {
    this.logger.debug(`importCopies: загрузили файл "${filePath}" во временную папку`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    await fs.unlink(filePath).catch((err) => {
      this.logger.warn(`Ошибка при удалении "${filePath}": ${err.message}`);
    });

    const sheet = workbook.getWorksheet('copies');
    if (!sheet) {
      this.logger.warn('В файле нет вкладки "copies"');
      return { created: 0, skipped: 0, message: 'No "copies" sheet found' };
    }

    let created = 0;
    let skipped = 0;
    const totalRows = sheet.rowCount;

    for (let rowIndex = 2; rowIndex <= totalRows; rowIndex++) {
      const row = sheet.getRow(rowIndex);

      const bookLocalIndex = (row.getCell(1).value ?? '').toString().trim();
      const copyInfo       = (row.getCell(2).value ?? '').toString().trim();

      if (!bookLocalIndex) {
        skipped++;
        continue;
      }

      try {
        const book = await this.booksService.findOneByLocalIndex(bookLocalIndex);
        if (!book) {
          // Книга не найдена
          skipped++;
          continue;
        }

        await this.copiesService.create({
          book,
          copyInfo,
        });
        created++;
      } catch (err) {
        this.logger.error(
          `Ошибка в строке #${rowIndex}, bookLocalIndex="${bookLocalIndex}": ${err.message}`,
        );
      }
    }

    return { created, skipped };
  }

  /* ========== ЭКСПОРТ КНИГ ========== */
  async exportBooks(limit = 0) {
    this.logger.debug(`exportBooks(limit=${limit})`);
    let books = [];

    if (limit && limit > 0) {
      // Берём нужное кол-во
      const paginated = await this.booksService.findPaginated('', false, 1, limit);
      books = paginated.data;
    } else {
      // Или все книги
      books = await this.booksService.findAll();
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('books');

    // Шапка
    sheet.addRow(['localIndex', 'title', 'authors', 'bookType', 'udc', 'bbk']);

    // Данные
    for (const b of books) {
      sheet.addRow([
        b.localIndex || '',
        b.title      || '',
        b.authors    || '',
        b.bookType   || '',
        b.udc        || '',
        b.bbk        || '',
      ]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.debug(`exportBooks: workbook создан, размер буфера = ${buffer.byteLength}`);
    return buffer;
  }

  /* ========== ЭКСПОРТ ЭКЗЕМПЛЯРОВ ========== */
  async exportCopies(limit = 0) {
    this.logger.debug(`exportCopies(limit=${limit})`);
    let copies = [];

    if (limit && limit > 0) {
      const paginated = await this.copiesService.findPaginated('', false, 1, limit);
      copies = paginated.data;
    } else {
      copies = await this.copiesService.findAll();
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('copies');

    // Шапка
    sheet.addRow(['bookLocalIndex', 'copyInfo']);

    // Строки
    for (const c of copies) {
      sheet.addRow([
        c.book?.localIndex || '',
        c.copyInfo         || '',
      ]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.debug(`exportCopies: workbook создан, размер буфера = ${buffer.byteLength}`);
    return buffer;
  }

  async makeBooksTemplate() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('books');
    sheet.addRow(['localIndex', 'title', 'authors', 'bookType', 'udc', 'bbk']);
    return await workbook.xlsx.writeBuffer();
  }

  async makeCopiesTemplate() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('copies');
    sheet.addRow(['bookLocalIndex', 'copyInfo']);
    return await workbook.xlsx.writeBuffer();
  }
}