import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('user') // Указываем имя таблицы как 'user'
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'username', unique: true })
  username: string;

  @Column({ name: 'password' })
  password: string;
}