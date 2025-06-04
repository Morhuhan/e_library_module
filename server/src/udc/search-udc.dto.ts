// src/library/dto/search-udc.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class SearchUdcDto {
  @IsOptional()
  @IsString()
  q?: string;
}