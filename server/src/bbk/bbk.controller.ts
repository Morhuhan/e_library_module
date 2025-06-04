// src/library/controllers/bbk.controller.ts
import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BbkService } from './bbk.service';
import { SearchBbkDto } from './search-bbk.dto';

@Controller('bbk')
@UseGuards(AuthGuard('jwt'))
export class BbkController {
  constructor(private readonly svc: BbkService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async search(@Query() { q }: SearchBbkDto) {
    return this.svc.search(q);
  }
}