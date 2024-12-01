import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

import { User } from './User';
import { WorkerStats } from './WorkerStats';

@Entity('Worker')
@Unique(['userAddress', 'name'])
export class Worker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '' })
  name: string;

  @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column('bigint', { default: () => '0' })
  hashrate1m: string;

  @Column('bigint', { default: () => '0' })
  hashrate5m: string;

  @Column('bigint', { default: () => '0' })
  hashrate1hr: string;

  @Column('bigint', { default: () => '0' })
  hashrate1d: string;

  @Column('bigint', { default: () => '0' })
  hashrate7d: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdate: Date;

  @Column('bigint', { default: () => '0' })
  shares: string;

  @Column('float', { default: 0 })
  bestShare: number;

  @Column('bigint', { default: '0' })
  bestEver: string;

  @ManyToOne('User', 'workers')
  user: Promise<User>;

  @Column()
  @Index()
  userAddress: string;

  @OneToMany('WorkerStats', 'worker')
  stats: WorkerStats[];
}
