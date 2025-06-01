import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { Role as RoleEntity } from 'src/auth/roles/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(RoleEntity)
    private rolesRepo: Repository<RoleEntity>,
  ) {}

  findOne(username: string) {
    return this.usersRepo.findOne({
      where: { username },
      relations: ['role'],
    });
  }

  async create(username: string, pass: string): Promise<User> {
    const hashed = await bcrypt.hash(pass, 10);
    const role = await this.rolesRepo.findOne({ where: { name: 'LIBRARIAN' } });

    const user = this.usersRepo.create({ username, pass: hashed, role });
    return this.usersRepo.save(user);
  }

  async createAdmin(username: string, plainPass: string) {
    const existing = await this.findOne(username);
    if (existing) return existing;

    const hashed = await bcrypt.hash(
      plainPass,
      Number(process.env.ADMIN_SALT_ROUNDS ?? 10) || 10,
    );

    const role = await this.rolesRepo.findOne({ where: { name: 'ADMIN' } });
    const admin = this.usersRepo.create({ username, pass: hashed, role });
    return this.usersRepo.save(admin);
  }

  async findAll(role?: string): Promise<User[]> {
    const qb = this.usersRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'r');

    if (role) qb.andWhere('r.name = :role', { role });

    return qb.getMany();
  }

  async resetPassword(id: number, newPass: string) {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('Пользователь не найден');

    user.pass = await bcrypt.hash(newPass, 10);
    await this.usersRepo.save(user);

    return { message: 'Пароль обновлён' };
  }

  async remove(id: number) {
    const res = await this.usersRepo.delete(id);
    if (!res.affected) throw new NotFoundException('Пользователь не найден');

    return { message: 'Пользователь удалён' };
  }
}