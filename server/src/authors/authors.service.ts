// src/library/services/authors.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, ILike, Repository, In } from 'typeorm';
import { Author } from './author.entity';

@Injectable()
export class AuthorsService {
  constructor(
    @InjectRepository(Author)
    private readonly repo: Repository<Author>,
  ) {}

  /** Поиск авторов по произвольной строке (фамилия / имя / отчество) */
  async search(q?: string): Promise<Author[]> {
    const term = (q ?? '').trim().toLowerCase();
    if (!term) return [];
    return this.repo
      .createQueryBuilder('a')
      .where(
        new Brackets(qb => {
          qb.where(
            `LOWER(CONCAT_WS(' ',
                COALESCE(a.last_name , ''),
                COALESCE(a.first_name, ''),
                COALESCE(a.patronymic, ''),
                COALESCE(a.birth_year::text, '')
            )) LIKE :like`, { like: `%${term}%` },
          );
        }),
      )
      .orderBy('a.last_name',  'ASC')
      .addOrderBy('a.first_name', 'ASC')
      .limit(25)
      .getMany();
  }

  async findByIds(ids: number[]): Promise<Author[]> {
    if (!ids?.length) return [];
    return this.repo.find({ where: { id: In(ids) } });
  }
}