// src/library/controllers/persons.controller.ts
import { Controller, Get, Header, Query, Param, Post, Put, Delete, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PersonsService } from './persons.service';
import { Person } from './person.entity';
import { AuthGuard } from '@nestjs/passport';
import { SearchPersonsDto } from './search-persons.dto';

@Controller('persons')
@UseGuards(AuthGuard('jwt'))
export class PersonsController {
  constructor(private readonly svc: PersonsService) {}

  // GET /persons?q=...
  @Get()
  @Header('Cache-Control', 'no-store')
  async search(@Query() { q }: SearchPersonsDto): Promise<Person[]> {
    return this.svc.search(q);
  }

  // GET /persons/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Person | null> {
    return this.svc.findOne(id);
  }

  // POST /persons
  @Post()
  create(@Body() data: Partial<Person>): Promise<Person> {
    return this.svc.create(data);
  }

  // PUT /persons/:id
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Person>,
  ): Promise<Person | null> {
    return this.svc.update(id, data);
  }

  // DELETE /persons/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.svc.remove(id);
  }
}