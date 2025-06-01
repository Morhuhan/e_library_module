import { Injectable, OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminSeeder implements OnModuleInit {
  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const username = this.config.get<string>('ADMIN_USERNAME');
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!username || !password) return;

    await this.usersService.createAdmin(username, password);
    console.log(`Аdmin user "${username}" гарантированно существует`);
  }
}