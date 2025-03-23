import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    ParseIntPipe,
    Put,
    UseGuards,
  } from '@nestjs/common';
  import { PersonsService } from './persons.service';
  import { Person } from './person.entity';
import { AuthGuard } from '@nestjs/passport';
  
  @Controller('persons')
  @UseGuards(AuthGuard('jwt'))
  export class PersonsController {
    constructor(private readonly personsService: PersonsService) {}
  
    // GET /persons
    @Get()
    findAll(): Promise<Person[]> {
      return this.personsService.findAll();
    }
  
    // GET /persons/:id
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number): Promise<Person | null> {
      return this.personsService.findOne(id);
    }
  
    // POST /persons
    @Post()
    create(@Body() data: Partial<Person>): Promise<Person> {
      return this.personsService.create(data);
    }
  
    // PUT /persons/:id
    @Put(':id')
    async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() data: Partial<Person>,
    ): Promise<Person | null> {
      return this.personsService.update(id, data);
    }
  
    // DELETE /persons/:id
    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
      return this.personsService.remove(id);
    }
  }