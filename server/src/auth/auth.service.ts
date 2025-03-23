import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as ms from 'ms';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(user: any) {
    const payload = { username: user.username, sub: user.id };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('ACCESS_TOKEN_EXPIRES_IN'),
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN'),
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    return { access_token, refresh_token };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const newAccessToken = this.jwtService.sign(
        { username: payload.username, sub: payload.sub },
        {
          expiresIn: this.configService.get<string>('ACCESS_TOKEN_EXPIRES_IN'),
          secret: this.configService.get<string>('JWT_SECRET'),
        },
      );

      return { access_token: newAccessToken };
    } catch (error) {
      console.error('Error verifying token:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && (await bcrypt.compare(pass, user.pass))) {
      const { pass, ...result } = user;
      return result;
    }
    return null;
  }

  // Устанавливает access_token в куки
  setAccessTokenCookie(res: Response, token: string) {
    const maxAge = ms(this.configService.get<string>('ACCESS_TOKEN_EXPIRES_IN'));
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge,
    });
  }

  // Устанавливает refresh_token в куки
  setRefreshTokenCookie(res: Response, token: string) {
    const refreshTokenMaxAge = ms(this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN'));
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: refreshTokenMaxAge,
    });
  }

  // Устанавливает оба токена в куки
  setCookies(res: Response, access_token: string, refresh_token: string) {
    this.setAccessTokenCookie(res, access_token);
    this.setRefreshTokenCookie(res, refresh_token);
  }

  // Очищает куки
  clearCookies(res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }
}