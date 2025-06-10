// book-copies.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BookCopy } from './book-copy.entity';
import { Repository } from 'typeorm';

@Injectable()
export class BookCopiesService {
  constructor(
    @InjectRepository(BookCopy)
    private readonly bookCopyRepository: Repository<BookCopy>,
  ) {}

  findAll(): Promise<BookCopy[]> {
    return this.bookCopyRepository.find({
      relations: ['book', 'borrowRecords'],
    });
  }

  findOne(id: number): Promise<BookCopy | null> {
    return this.bookCopyRepository.findOne({
      where: { id },
      relations: ['book', 'borrowRecords'],
    });
  }

  async create(data: Partial<BookCopy>): Promise<BookCopy> {
    const copy = this.bookCopyRepository.create(data);
    return this.bookCopyRepository.save(copy);
  }

  async update(id: number, data: Partial<BookCopy>): Promise<BookCopy | null> {
    await this.bookCopyRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.bookCopyRepository.delete(id);
  }

  async findByInventoryNo(inventoryNo: string): Promise<BookCopy | null> {
    return this.bookCopyRepository.findOne({
      where: { inventoryNo },
      relations: ['book', 'borrowRecords'],
    });
  }

  async findPaginated(
    search: string,
    onlyAvailable: boolean,
    page: number,
    limit: number,
  ): Promise<{
    data: BookCopy[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.bookCopyRepository
      .createQueryBuilder('copy')
      .leftJoinAndSelect('copy.book', 'book')
      .leftJoinAndSelect('copy.borrowRecords', 'borrowRecords');

    if (search) {
      qb.where(
        'book.title ILIKE :search OR copy.inventoryNo ILIKE :search',
        { search: `%${search}%` },
      );
    }

    if (onlyAvailable) {
      qb.andWhere((qb2) => {
        const subQuery = qb2
          .subQuery()
          .select('1')
          .from('borrow_record', 'br')
          .where('br.bookCopyId = copy.id')
          .andWhere('br.returnDate IS NULL')
          .getQuery();
        return `NOT EXISTS ${subQuery}`;
      });
    }

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const data = await qb.getMany();

    return { data, total, page, limit };
  }
}