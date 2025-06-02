import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { TypeOrmExceptionFilter } from './_excepions/typeorm-exception.filter';
import { networkInterfaces } from 'os';
import { Logger } from '@nestjs/common';
import axios from 'axios';

async function getPublicIp(): Promise<string> {
  try {
    const response = await axios.get('https://ifconfig.me');
    return response.data;
  } catch (error) {
    return 'Unable to fetch public IP';
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.use(cookieParser());
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalFilters(new TypeOrmExceptionFilter());

  const port = 3000;
  const host = '0.0.0.0';

  await app.listen(port, host);

  // Получаем локальные IP-адреса
  const nets = networkInterfaces();
  const localAddresses: string[] = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        localAddresses.push(net.address);
      }
    }
  }

  // Получаем публичный IP
  const publicIp = await getPublicIp();

  // Выводим информацию
  logger.log(`Server is running on:`);
  logger.log(`- Local: http://localhost:${port}`);
  localAddresses.forEach((address) => {
    logger.log(`- Network (local): http://${address}:${port}`);
  });
  logger.log(`- Public: http://${publicIp}:${port}`);
}

bootstrap();