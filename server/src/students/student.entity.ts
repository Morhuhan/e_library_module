import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('student') // название таблицы
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'middle_name', nullable: true })
  middleName: string | null;

  @Column({ name: 'group_name', nullable: true })
  groupName: string | null;
}