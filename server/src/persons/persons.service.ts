// src/library/services/persons.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Person } from './person.entity';

@Injectable()
export class PersonsService {
  constructor(
    @InjectRepository(Person)
    private readonly repo: Repository<Person>,
  ) {}

  /** Поиск читателей по произвольной строке */
  async search(q?: string): Promise<Person[]> {
    const term = (q ?? '').trim().toLowerCase();
    if (!term) return [];
    return this.repo
      .createQueryBuilder('p')
      .where(
        new Brackets(qb => {
          qb.where(
            `LOWER(CONCAT_WS(' ',
                COALESCE(p.last_name , ''),
                COALESCE(p.first_name, ''),
                COALESCE(p.patronymic, ''),
                COALESCE(EXTRACT(year FROM p.birthday)::text, '')
            )) LIKE :like`,
            { like: `%${term}%` },
          );
        }),
      )
      .orderBy('p.last_name', 'ASC')
      .addOrderBy('p.first_name', 'ASC')
      .limit(25)
      .getMany();
  }

  findOne(id: number): Promise<Person | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<Person>): Promise<Person> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: number, data: Partial<Person>): Promise<Person | null> {
    const person = await this.findOne(id);
    if (!person) return null;
    Object.assign(person, data);
    return this.repo.save(person);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}