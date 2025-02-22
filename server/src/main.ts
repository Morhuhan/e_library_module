import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TypeOrmExceptionFilter } from './excepions/typeorm-exception.filter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Подключаем cookie-parser
  app.use(cookieParser());

  app.enableCors({
    origin: 'http://localhost:3000', 
    credentials: true, 
  });

  // Регистрируем как глобальный фильтр
  app.useGlobalFilters(new TypeOrmExceptionFilter());

  const PORT = 4000;
  await app.listen(PORT);
  console.log(`Application is running on: http://localhost:${PORT}`);
}
bootstrap();
