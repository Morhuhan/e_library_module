// src/library/services/publishers.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Publisher } from './publisher.entity';

@Injectable()
export class PublishersService {
  constructor(
    @InjectRepository(Publisher)
    private readonly repo: Repository<Publisher>,
  ) {}

  /** Поиск издателей по названию */
  async search(q?: string): Promise<Publisher[]> {
    const term = (q ?? '').trim();
    if (!term) return [];

    return this.repo.find({
      where: { name: ILike(`%${term}%`) },
      order: { name: 'ASC' },
      take: 25,
    });
  }

  async findByIds(ids: number[]): Promise<Publisher[]> {
    if (!ids?.length) return [];
    return this.repo.findBy({ id: ids as any });
  }
}