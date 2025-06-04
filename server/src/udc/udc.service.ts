// src/library/services/udc.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Udc } from './udc.entity';

@Injectable()
export class UdcService {
  constructor(
    @InjectRepository(Udc)
    private readonly repo: Repository<Udc>,
  ) {}

  /** Поиск УДК по аббревиатуре или описанию */
  async search(q?: string): Promise<{ id: number; code: string; description: string | null }[]> {
    const term = (q ?? '').trim().toLowerCase();
    if (!term) return [];

    const like = `%${term}%`;
    const list = await this.repo
      .createQueryBuilder('u')
      .where('LOWER(u.udcAbb) LIKE :like', { like })
      .orWhere('LOWER(COALESCE(u.description, \'\')) LIKE :like', { like })
      .orderBy('u.udcAbb', 'ASC')
      .limit(25)
      .getMany();

    return list.map((u) => ({
      id: u.id,
      code: u.udcAbb,
      description: u.description,
    }));
  }
}