import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person } from './person.entity';

@Injectable()
export class PersonsService {
  constructor(
    @InjectRepository(Person)
    private readonly personsRepository: Repository<Person>,
  ) {}

  findAll(): Promise<Person[]> {
    return this.personsRepository.find();
  }

  findOne(id: number): Promise<Person | null> {
    return this.personsRepository.findOne({ where: { id } });
  }

  create(data: Partial<Person>): Promise<Person> {
    const newPerson = this.personsRepository.create(data);
    return this.personsRepository.save(newPerson);
  }

  async update(id: number, data: Partial<Person>): Promise<Person | null> {
    const person = await this.findOne(id);
    if (!person) {
      return null;
    }
    Object.assign(person, data);
    return this.personsRepository.save(person);
  }

  async remove(id: number): Promise<void> {
    await this.personsRepository.delete(id);
  }
}