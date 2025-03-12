import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOne(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async create(username: string, pass: string): Promise<User> {
    const hashedpass = await bcrypt.hash(pass, 10);
    const user = this.usersRepository.create({ username, pass: hashedpass });
    return this.usersRepository.save(user);
  }
}
