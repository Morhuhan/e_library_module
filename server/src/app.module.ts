import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/book.module';
import { BorrowRecordsModule } from './borrow-records/borrow-records.module';
import { BookCopiesModule } from './book-copies/book-copies.module';
import { PersonsModule } from './persons/persons.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '2121212q',
      database: 'Library',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
    }),

    // ВАЖНО: ServeStaticModule раздаёт React-сборку
    // exclude: ['/api*'] — чтобы не перехватывать запросы, идущие на /api
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'client', 'build'),
      exclude: ['/api*'],
    }),

    UsersModule,
    AuthModule,
    BooksModule,
    BorrowRecordsModule,
    BookCopiesModule,
    PersonsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}