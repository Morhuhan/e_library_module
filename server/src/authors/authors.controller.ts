// src/library/controllers/authors.controller.ts
import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { SearchAuthorsDto } from './search-authors.dto';
import { AuthorsService } from './authors.service';
import { Author } from './author.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('authors')
@UseGuards(AuthGuard('jwt'))
export class AuthorsController {
  constructor(private readonly svc: AuthorsService) {}

  @Get()
  @Header('Cache-Control', 'no-store') 
  async search(@Query() { q }: SearchAuthorsDto): Promise<Author[]> {
    return this.svc.search(q);
  }
}