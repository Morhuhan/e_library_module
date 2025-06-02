import {
  Controller,
  Post,
  Res,
  Body,
  Request,
  Get,
  UseGuards,
} from '@nestjs/common';
import { Response, Request as ExpressReq } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body, @Res() res: Response) {
    return this.authService.handleLogin(body, res);
  }

  @Post('logout')
  logout(@Res() res: Response) {
    return this.authService.handleLogout(res);
  }

  @Post('refresh')
  refresh(@Request() req: ExpressReq, @Res() res: Response) {
    return this.authService.handleRefresh(req, res);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Request() req) {
    return req.user;
  }
}