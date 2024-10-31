import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

import { UserStats } from './UserStats';
import { Worker } from './Worker';

@Entity('User')
export class User {
  @PrimaryColumn()
  @Index('User_address_key', { unique: true })
  address: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('bigint', { default: '0' })
  authorised: string;

  @OneToMany(() => Worker, (worker) => worker.user)
  workers: Worker[];

  @OneToMany(() => UserStats, (stats) => stats.user)
  stats: UserStats[];

  @Column({ default: true })
  @Index('User_isActive_idx')
  isActive: boolean;

  @Column({ default: true })
  @Index('User_isPublic_idx')
  isPublic: boolean;
}
