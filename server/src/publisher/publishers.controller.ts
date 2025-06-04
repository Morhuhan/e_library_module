// src/library/controllers/publishers.controller.ts
import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PublishersService } from './publishers.service';
import { SearchPublishersDto } from './search-publishers.dto';
import { Publisher } from './publisher.entity';

@Controller('publishers')
@UseGuards(AuthGuard('jwt'))
export class PublishersController {
  constructor(private readonly svc: PublishersService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async search(@Query() { q }: SearchPublishersDto): Promise<Publisher[]> {
    return this.svc.search(q);
  }
}