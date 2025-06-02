// src/filters/typeorm-exception.filter.ts
import { Catch, ExceptionFilter, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    const driverError = exception.driverError as any;
    const pgCode = driverError?.code;              
    const constraintName = driverError?.constraint; 

    // Нарушение уникального ключа 
    if (pgCode === '23505') {
      status = HttpStatus.CONFLICT;
      if (constraintName === 'idx_borrowrecord_book_copy_id_return_null') {
        message = 'Книга (экземпляр) уже выдана и ещё не возвращена!';
      } else {
        message = 'Данные уже существуют (duplicate key).';
      }
    }

    // Нарушение внешнего ключа
    else if (pgCode === '23503') {
      status = HttpStatus.BAD_REQUEST;
      message = 'Невозможно удалить/изменить: нарушение внешнего ключа.';
    }

    // Кастомные ошибки из триггера
    else if (pgCode === 'P0001') {
      status = HttpStatus.BAD_REQUEST;

      if (constraintName === 'err_book_borrowed') {
        message = exception.message;
      } else if (constraintName === 'err_book_copy_borrowed') {
        message = exception.message;
      } else {
        message = exception.message;
      }
    }

    response.status(status).json({
      statusCode: status,
      message: message,
    });
  }
}