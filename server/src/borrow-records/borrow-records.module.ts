import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BorrowRecord } from './borrow-record.entity';
import { BorrowRecordsService } from './borrow-records.service';
import { BorrowRecordsController } from './borrow-records.controller';
import { User } from 'src/users/user.entity';
import { BookCopy } from 'src/book-copies/book-copy.entity';
import { Person } from 'src/persons/person.entity'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BorrowRecord,
      User,
      BookCopy,
      Person, 
    ]),
  ],
  providers: [BorrowRecordsService],
  controllers: [BorrowRecordsController],
  exports: [BorrowRecordsService],
})
export class BorrowRecordsModule {}