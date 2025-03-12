import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookCopy } from './book-copy.entity';
import { BookCopiesController } from './book-copies.controller';
import { BookCopiesService } from './book-copies.service';

@Module({
  imports: [TypeOrmModule.forFeature([BookCopy])],
  providers: [BookCopiesService],
  controllers: [BookCopiesController],
  exports: [BookCopiesService],
})
export class BookCopiesModule {}