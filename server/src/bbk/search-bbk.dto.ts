// src/library/dto/search-bbk.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class SearchBbkDto {
  @IsOptional()
  @IsString()
  q?: string;
}