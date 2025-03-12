import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BorrowRecord } from './borrow-record.entity';
import { BorrowRecordsService } from './borrow-records.service';
import { BorrowRecordsController } from './borrow-records.controller';
import { Student } from 'src/students/student.entity';
import { User } from 'src/users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BorrowRecord, Student, User]) 
  ],
  providers: [BorrowRecordsService],
  controllers: [BorrowRecordsController],
  exports: [BorrowRecordsService],
})
export class BorrowRecordsModule {}