import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('person')
export class Person {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'patronymic', nullable: true })
  patronymic?: string;

  @Column({ name: 'sex' })
  sex: string;

  @Column({ name: 'birthday', type: 'date' })
  birthday: Date;
}