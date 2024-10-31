import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('PoolStats')
export class PoolStats {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  @Index()
  timestamp: Date;

  @Column()
  runtime: number;

  @Column()
  users: number;

  @Column()
  workers: number;

  @Column()
  idle: number;

  @Column()
  disconnected: number;

  @Column('bigint', { default: '0' })
  hashrate1m: bigint;

  @Column('bigint', { default: '0' })
  hashrate5m: bigint;

  @Column('bigint', { default: '0' })
  hashrate15m: bigint;

  @Column('bigint', { default: '0' })
  hashrate1hr: bigint;

  @Column('bigint', { default: '0' })
  hashrate6hr: bigint;

  @Column('bigint', { default: '0' })
  hashrate1d: bigint;

  @Column('bigint', { default: '0' })
  hashrate7d: bigint;

  @Column('float')
  diff: number;

  @Column('bigint')
  accepted: bigint;

  @Column('bigint')
  rejected: bigint;

  @Column('bigint')
  bestshare: bigint;

  @Column('float')
  SPS1m: number;

  @Column('float')
  SPS5m: number;

  @Column('float')
  SPS15m: number;

  @Column('float')
  SPS1h: number;
}
