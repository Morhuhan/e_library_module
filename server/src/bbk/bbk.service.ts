// src/library/services/bbk.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bbk } from './bbk.entity';

@Injectable()
export class BbkService {
  constructor(
    @InjectRepository(Bbk)
    private readonly repo: Repository<Bbk>,
  ) {}

  /** Поиск ББК по аббревиатуре или описанию */
  async search(q?: string): Promise<{ id: number; code: string; description: string | null }[]> {
    const term = (q ?? '').trim().toLowerCase();
    if (!term) return [];

    const like = `%${term}%`;
    const list = await this.repo
      .createQueryBuilder('b')
      .where('LOWER(b.bbkAbb) LIKE :like', { like })
      .orWhere('LOWER(COALESCE(b.description, \'\')) LIKE :like', { like })
      .orderBy('b.bbkAbb', 'ASC')
      .limit(25)
      .getMany();

    return list.map((b) => ({
      id: b.id,
      code: b.bbkAbb,
      description: b.description,
    }));
  }
}