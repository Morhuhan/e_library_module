import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Данные, которые можно прислать при обновлении книги */
export class UpdateBookDto {
  /* ───────── скалярные поля ───────── */
  @IsOptional() @IsString() @MaxLength(500)
  title?: string;

  @IsOptional() @IsString()
  localIndex?: string;

  @IsOptional() @IsString()
  bookType?: string;

  @IsOptional() @IsString()
  edit?: string;

  @IsOptional() @IsString()
  editionStatement?: string;

  @IsOptional() @IsString()
  series?: string;

  @IsOptional() @IsString()
  physDesc?: string;

  /* ───────── авторы ───────── */
  /** список id авторов, выбранный в UI */
  @IsOptional() @IsArray() @IsInt({ each: true })
  authorsIds?: number[];

  /* ───────── классификаторы ───────── */
  @IsOptional() @IsArray() @IsString({ each: true })
  bbkAbbs?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  udcAbbs?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  bbkRawCodes?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  udcRawCodes?: string[];

  /* ───────── место публикации ───────── */
  @IsOptional()
  pubPlaces?: {
    city?: string;
    publisherName?: string;
    pubYear?: number;
  }[];
}