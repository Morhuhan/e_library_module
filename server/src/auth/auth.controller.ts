import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Res,
  Get,
  Request,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request as ExpressRequest } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { username: string; pass: string },
    @Res() res: Response,
  ) {
    const user = await this.authService.validateUser(body.username, body.pass);
    if (!user) {
      throw new UnauthorizedException('Неправильный логин или пароль');
    }

    const { access_token, refresh_token } = await this.authService.login(user);

    this.authService.setCookies(res, access_token, refresh_token);

    return res.json({
      message: 'Вы успешно авторизовались',
      username: user.username,
    });
  }

  @Post('logout')
  logout(@Res() res: Response) {
    this.authService.clearCookies(res);
    return res.json({ message: 'Вы вышли из системы' });
  }

  @Post('refresh')
  async refresh(@Req() req: ExpressRequest, @Res() res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Отсутствует refresh_token в куках');
    }
  
    try {
      const { access_token } = await this.authService.refreshToken(refreshToken);
      this.authService.setAccessTokenCookie(res, access_token);
  
      return res.json({ access_token });
    } catch (error) {
      console.error('Ошибка при обновлении токена:', error);
      this.authService.clearCookies(res);  
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getCurrentUser(@Request() req) {
    return req.user;
  }
}