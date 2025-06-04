// src/library/dto/search-publishers.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class SearchPublishersDto {
  @IsOptional()
  @IsString()
  q?: string;
}