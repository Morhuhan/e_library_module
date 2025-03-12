// auth.controller.ts
import { Controller, Post, Body, UnauthorizedException, Res, Get, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as ms from 'ms';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('login')
  async login(
    @Body() body: { username: string; pass: string },
    @Res() res: Response,
  ) {
    const user = await this.authService.validateUser(body.username, body.pass);
    if (!user) {
      throw new UnauthorizedException('Неправильный логин или пароль');
    }

    // Получаем access_token из сервиса
    const loginData = await this.authService.login(user);
    const { access_token } = loginData;

    // Получаем время жизни токена из .env и преобразуем его в миллисекунды
    const jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN');
    const maxAge = ms(jwtExpiresIn); // Например, "24h" -> 86400000

    // Устанавливаем http-only cookie с токеном
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true, 
      sameSite: 'lax',
      maxAge, // время жизни cookie в миллисекундах
    });

    // Возвращаем информацию о пользователе
    return res.json({
      message: 'Вы успешно авторизовались',
      username: user.username,
    });
  }

  @Post('logout')
  logout(@Res() res: Response) {
    // Очищаем cookie
    res.clearCookie('access_token');
    return res.json({ message: 'Вы вышли из системы' });
  }

  // Новый метод для получения информации о текущем пользователе
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getCurrentUser(@Request() req) {
    return req.user; // Должен быть доступен пользователь, если guard прошел успешно
  }
}