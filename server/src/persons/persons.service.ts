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

  // Получить список всех "Person"
  findAll(): Promise<Person[]> {
    return this.personsRepository.find();
  }

  // Найти одного по ID
  findOne(id: number): Promise<Person | null> {
    return this.personsRepository.findOne({ where: { id } });
  }

  // Создать новую запись
  create(data: Partial<Person>): Promise<Person> {
    const newPerson = this.personsRepository.create(data);
    return this.personsRepository.save(newPerson);
  }

  // Обновить данные
  async update(id: number, data: Partial<Person>): Promise<Person | null> {
    // Проверяем, есть ли такой person
    const person = await this.findOne(id);
    if (!person) {
      return null;
    }
    // Обновляем в памяти
    Object.assign(person, data);
    // Сохраняем в БД
    return this.personsRepository.save(person);
  }

  // Удалить
  async remove(id: number): Promise<void> {
    await this.personsRepository.delete(id);
  }
}