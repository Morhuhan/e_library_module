  // jwt.strategy.ts
  import { Injectable } from '@nestjs/common';
  import { PassportStrategy } from '@nestjs/passport';
  import { ExtractJwt, Strategy } from 'passport-jwt';
  import { ConfigService } from '@nestjs/config';
  import { Request } from 'express';

  @Injectable()
  export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
      super({
        jwtFromRequest: ExtractJwt.fromExtractors([
          (request: Request) => {
            return request?.cookies?.access_token || null;
          },
        ]),
        ignoreExpiration: false,
        secretOrKey: configService.get<string>('JWT_SECRET'),
      });
    }

    async validate(payload: any) {
      return { userId: payload.sub, username: payload.username };
    }
  }