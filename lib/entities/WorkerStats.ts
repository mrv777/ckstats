import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';

import { Worker } from './Worker';

@Entity('WorkerStats')
export class WorkerStats {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Worker, (worker) => worker.stats)
  @JoinColumn({ name: 'workerId', referencedColumnName: 'id' })
  worker: Promise<Worker>;

  @Column()
  workerId: number;

  @Column('bigint', { default: '0' })
  hashrate1m: string;

  @Column('bigint', { default: '0' })
  hashrate5m: string;

  @Column('bigint', { default: '0' })
  hashrate1hr: string;

  @Column('bigint', { default: '0' })
  hashrate1d: string;

  @Column('bigint', { default: '0' })
  hashrate7d: string;

  @Column('bigint', { default: '0' })
  shares: string;

  @Column('float', { default: 0 })
  bestShare: number;

  @Column('bigint', { default: '0' })
  bestEver: string;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  timestamp: Date;
}
