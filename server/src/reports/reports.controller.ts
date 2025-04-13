// src/reports/reports.controller.ts

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('unreturned')
  async getUnreturned() {
    return this.reportsService.getUnreturned();
  }

  @Get('overdue')
  async getOverdue() {
    return this.reportsService.getOverdue();
  }

  @Get('popular')
  async getPopular() {
    return this.reportsService.getPopular();
  }

  @Get('active-readers')
  async getActiveReaders() {
    return this.reportsService.getActiveReaders();
  }

  @Get('no-copies')
  async getBooksWithoutCopies() {
    return this.reportsService.getBooksWithoutCopies();
  }

  
}