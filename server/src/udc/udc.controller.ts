// src/library/controllers/udc.controller.ts
import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UdcService } from './udc.service';
import { SearchUdcDto } from './search-udc.dto';

@Controller('udc')
@UseGuards(AuthGuard('jwt'))
export class UdcController {
  constructor(private readonly svc: UdcService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async search(@Query() { q }: SearchUdcDto) {
    return this.svc.search(q);
  }
}