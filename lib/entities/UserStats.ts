import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';

import { User } from './User';

@Entity('UserStats')
export class UserStats {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.stats)
  @JoinColumn({ name: 'userAddress', referencedColumnName: 'address' })
  user: Promise<User>;

  @Column()
  @Index('userAddress_timestamp_idx')
  @Index('userAddress_bestEver_timestamp_idx')
  @Index('userAddress_hashrate1hr_timestamp_idx')
  userAddress: string;

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
  lastShare: string;

  @Column({ default: 0 })
  workerCount: number;

  @Column('bigint', { default: '0' })
  shares: string;

  @Column('float', { default: 0 })
  bestShare: number;

  @Column('bigint', { default: '0' })
  bestEver: string;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index('timestamp_idx')
  @Index('userAddress_timestamp_idx')
  @Index('userAddress_bestEver_timestamp_idx')
  @Index('userAddress_hashrate1hr_timestamp_idx')
  timestamp: Date;
}
