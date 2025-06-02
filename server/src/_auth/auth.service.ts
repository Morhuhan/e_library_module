import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as ms from 'ms';
import { Response, Request } from 'express';


@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}


  private async validateUser(username: string, pass: string) {
    const user = await this.users.findOne(username);
    if (user && (await bcrypt.compare(pass, user.pass))) {
      const { pass: _, ...safe } = user;
      return safe;
    }
    throw new UnauthorizedException('Неправильный логин или пароль');
  }

  private sign(
    payload: Record<string, unknown>,
    life: string,
  ) {
    return this.jwt.sign(payload, {
      expiresIn: life,
      secret: this.cfg.get<string>('JWT_SECRET'),
    });
  }

  private setTokenCookie(
    res: Response,
    name: string,
    token: string,
    life: string,
  ) {
    res.cookie(name, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.cfg.get<string>('NODE_ENV') === 'production',
      maxAge: ms(life),
      path: '/',
    });
  }

  private setUsernameCookie(res: Response, username: string) {
    res.cookie('username', username, {
      httpOnly: false,
      sameSite: 'lax',
      secure: this.cfg.get<string>('NODE_ENV') === 'production',
      maxAge: ms('7d'),
      path: '/',
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    res.clearCookie('username', { path: '/' });
  }

  async handleLogin(
    { username, pass }: { username: string; pass: string },
    res: Response,
  ) {
    const user = await this.validateUser(username, pass);

    const payload = { username: user.username, sub: user.id, role: user.role.name };

    const access = this.sign(payload, this.cfg.get('ACCESS_TOKEN_EXPIRES_IN'));
    const refresh = this.sign(payload, this.cfg.get('REFRESH_TOKEN_EXPIRES_IN'));

    this.setTokenCookie(res, 'access_token', access, this.cfg.get('ACCESS_TOKEN_EXPIRES_IN'));
    this.setTokenCookie(res, 'refresh_token', refresh, this.cfg.get('REFRESH_TOKEN_EXPIRES_IN'));
    this.setUsernameCookie(res, user.username);

    return res.json({ message: 'OK' });
  }

  handleLogout(res: Response) {
    this.clearCookies(res);
    return res.json({ message: 'Вы вышли из системы' });
  }

  async handleRefresh(req: Request, res: Response) {
    const rt = req.cookies?.refresh_token;
    if (!rt) throw new UnauthorizedException('Нет refresh_token');

    let payload: any;
    try {
      payload = this.jwt.verify(rt, {
        secret: this.cfg.get<string>('JWT_SECRET'),
      });
    } catch {
      this.clearCookies(res);
      throw new UnauthorizedException('Неверный или истёкший refresh_token');
    }

    const newAccess = this.sign(
      { username: payload.username, sub: payload.sub, role: payload.role },
      this.cfg.get('ACCESS_TOKEN_EXPIRES_IN'),
    );

    this.setTokenCookie(res, 'access_token', newAccess, this.cfg.get('ACCESS_TOKEN_EXPIRES_IN'));
    return res.json({ access_token: newAccess });
  }
}