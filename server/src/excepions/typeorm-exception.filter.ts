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

    if (pgCode === '23505') {
      status = HttpStatus.CONFLICT;
      if (constraintName === 'idx_borrowrecord_book_id_return_date_null') {
        message = 'Книга уже выдана и ещё не возвращена!';
      } else {
        message = 'Данные уже существуют (duplicate key).';
      }
    }
    //Нарушение внешнего ключа
    else if (pgCode === '23503') {
      status = HttpStatus.BAD_REQUEST;
      message = 'Неверные данные. Нарушение внешнего ключа.';
    }
    response.status(status).json({
      statusCode: status,
      error: message,
    });
  }
}