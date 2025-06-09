// src/library/dto/search-persons.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class SearchPersonsDto {
  @IsOptional()
  @IsString()
  q?: string;
}