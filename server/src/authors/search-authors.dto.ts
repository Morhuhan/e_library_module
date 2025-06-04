// src/library/dto/search-authors.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class SearchAuthorsDto {
  @IsOptional()
  @IsString()
  q?: string;
}