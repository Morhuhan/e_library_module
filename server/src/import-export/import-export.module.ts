import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ImportExportService } from './import-export.service';
import { ImportExportController } from './import-export.controller';

import { BookCopiesModule } from '../book-copies/book-copies.module';
import { BooksModule } from 'src/books/book.module';

@Module({
  imports: [
    BooksModule,
    BookCopiesModule,

    // для загрузки файлов Excel
    MulterModule.register({
      dest: './uploads', 
    }),
  ],
  providers: [ImportExportService],
  controllers: [ImportExportController],
})
export class ImportExportModule {}