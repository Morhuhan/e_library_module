import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './student.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
  ) {}

  // Получить список всех студентов
  findAll(): Promise<Student[]> {
    return this.studentsRepository.find();
  }

  // Найти одного по ID
  findOne(id: number): Promise<Student | null> {
    // findOne в TypeORM 0.3 возвращает Promise<Student | null>
    return this.studentsRepository.findOne({ where: { id } });
  }

  // Создать нового студента
  create(data: Partial<Student>): Promise<Student> {
    // data — объект, который содержит поля: { firstName, lastName, middleName, groupName }
    const newStudent = this.studentsRepository.create(data);
    return this.studentsRepository.save(newStudent);
  }

  // Обновить данные студента
  async update(id: number, data: Partial<Student>): Promise<Student | null> {
    // data — поля, которые нужно обновить
    await this.studentsRepository.update(id, data);
    return this.findOne(id);
  }

  // Удалить студента
  async remove(id: number): Promise<void> {
    await this.studentsRepository.delete(id);
  }
}