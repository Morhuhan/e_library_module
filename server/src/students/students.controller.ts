import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { Student } from './student.entity';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // Получить всех
  @Get()
  findAll(): Promise<Student[]> {
    return this.studentsService.findAll();
  }

  // Получить одного по ID
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Student | null> {
    return this.studentsService.findOne(id);
  }

  // Создать
  @Post()
  create(@Body() data: Partial<Student>): Promise<Student> {
    // data = { firstName, lastName, middleName, groupName }
    return this.studentsService.create(data);
  }

  // Обновить
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Student>,
  ): Promise<Student | null> {
    return this.studentsService.update(id, data);
  }

  // Удалить
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.studentsService.remove(id);
  }
}