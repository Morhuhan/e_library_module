import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './book.entity';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) {}

  findAll(): Promise<Book[]> {
    return this.bookRepository.find({
      relations: ['bookCopies'],
    });
  }

  async findPaginated(
    search: string,
    onlyAvailable: boolean,
    page: number,
    limit: number,
  ): Promise<{
    data: Book[];
    total: number;
    page: number;
    limit: number;
  }> {
    let qb = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.bookCopies', 'bookCopy')
      .leftJoinAndSelect('bookCopy.borrowRecords', 'borrowRecord');

    if (search) {
      qb = qb.where('book.title LIKE :search', { search: `%${search}%` });
    }

    if (onlyAvailable) {
      qb = qb.andWhere(`
        EXISTS (
          SELECT 1
          FROM "book_copy" bc
          WHERE bc."book_id" = book.id
            AND NOT EXISTS (
              SELECT 1
              FROM "borrow_record" br
              WHERE br."book_copy_id" = bc.id
                AND br."return_date" IS NULL
            )
        )
      `);
    }

    qb = qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOneWithRelations(id: number): Promise<Book> {
    return this.bookRepository.findOneOrFail({
      where: { id },
      relations: ['bookCopies', 'bookCopies.borrowRecords'],
    });
  }


  async create(data: Partial<Book>): Promise<Book> {
    const book = this.bookRepository.create(data);
    return this.bookRepository.save(book);
  }


  async update(id: number, data: Partial<Book>): Promise<Book | null> {
    const existing = await this.bookRepository.findOne({ where: { id } });
    if (!existing) {
      return null;
    }
    await this.bookRepository.update(id, data);
    return this.findOneWithRelations(id);
  }


  async remove(id: number): Promise<void> {
    await this.bookRepository.delete(id);
  }


  async findOneByLocalIndex(localIndex: string): Promise<Book | null> {
    return this.bookRepository.findOne({
      where: { localIndex },
      relations: ['bookCopies', 'bookCopies.borrowRecords'],
    });
  }
}