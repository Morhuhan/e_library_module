import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { BorrowRecordsModule } from './borrow-records/borrow-records.module';
import { StudentsModule } from './students/students.module';
import { BookCopiesModule } from './book-copies/book-copies.module';

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
    UsersModule,
    AuthModule,
    BooksModule,
    BorrowRecordsModule,
    StudentsModule,
    BookCopiesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}