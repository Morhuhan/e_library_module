import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './user.entity';
import { Role as RoleEntity } from 'src/_auth/roles/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,

    @InjectRepository(RoleEntity)
    private readonly rolesRepo: Repository<RoleEntity>,
  ) {}

  /* ─────────────────────────── helpers ─────────────────────────── */

  /** найти или создать роль с указанным именем */
  private async getOrCreateRole(name: string): Promise<RoleEntity> {
    let role = await this.rolesRepo.findOne({ where: { name } as any });
    if (!role) {
      role = this.rolesRepo.create({ name });
      await this.rolesRepo.save(role);
    }
    return role;
  }

  /** вернуть пользователя по логину вместе с ролью */
  findOne(username: string) {
    return this.usersRepo.findOne({
      where: { username },
      relations: ['role'],
    });
  }

  /* ───────────────────────── public API ───────────────────────── */

  /** создать библиотекаря (роль LIBRARIAN) */
  async create(username: string, pass: string): Promise<User> {
    if (await this.findOne(username)) {
      throw new ConflictException('Пользователь уже существует');
    }

    const hashed = await bcrypt.hash(pass, 10);
    const role = await this.getOrCreateRole('LIBRARIAN');

    const user = this.usersRepo.create({ username, pass: hashed, role });
    return this.usersRepo.save(user);
  }

  /** гарантировать наличие админа; если есть — вернуть существующего */
  async createAdmin(username: string, plainPass: string): Promise<User> {
    const existing = await this.findOne(username);
    if (existing) return existing;

    const rounds = Number(process.env.ADMIN_SALT_ROUNDS ?? 10) || 10;
    const hashed = await bcrypt.hash(plainPass, rounds);
    const role = await this.getOrCreateRole('ADMIN');

    const admin = this.usersRepo.create({ username, pass: hashed, role });
    return this.usersRepo.save(admin);
  }

  /** получить всех или только пользователей с указанной ролью */
  async findAll(role?: string): Promise<User[]> {
    const qb = this.usersRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'r');

    if (role) qb.andWhere('r.name = :role', { role });

    return qb.getMany();
  }

  /** сброс пароля по id */
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

  /** удалить пользователя по id */
  async remove(id: number) {
    const res = await this.usersRepo.delete(id);
    if (!res.affected) throw new NotFoundException('Пользователь не найден');

    return { message: 'Пользователь удалён' };
  }
}