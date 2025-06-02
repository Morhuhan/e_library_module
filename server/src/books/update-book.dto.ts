import {
  IsArray, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PubPlaceDto {
  @IsOptional() @IsString() @MaxLength(128) city?: string;
  @IsOptional() @IsString() @MaxLength(128) publisherName?: string;
  @IsOptional() @IsInt() @Min(1000) pubYear?: number;
}

export class UpdateBookDto {
  /* simple */
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() localIndex?: string;
  @IsOptional() @IsString() bookType?: string;
  @IsOptional() @IsString() edit?: string;
  @IsOptional() @IsString() editionStatement?: string;
  @IsOptional() @IsString() series?: string;
  @IsOptional() @IsString() physDesc?: string;

  /* arrays */
  @IsOptional() @IsArray() @IsString({ each: true }) authorsNames?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) bbkAbbs?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) udcAbbs?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) bbkRawCodes?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) udcRawCodes?: string[];

  /* nested */
  @IsOptional() @ValidateNested({ each: true }) @Type(() => PubPlaceDto)
  pubPlaces?: PubPlaceDto[];
}