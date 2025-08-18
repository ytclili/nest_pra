import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * 刷新令牌实体 - 存储用户的刷新令牌
 * 用于实现令牌轮换和安全的令牌管理
 */
@Entity('refresh_tokens') // 数据库表名
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid') // 使用 UUID 作为主键
  id: string;

  @Column() // 刷新令牌字符串
  token: string;

  @Column({ name: 'user_id' }) // 用户ID外键
  userId: string;

  /**
   * 多对一关系：多个刷新令牌属于一个用户
   * 当用户被删除时，相关的刷新令牌也会被删除
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'expires_at' }) // 令牌过期时间
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' }) // 创建时间，自动设置
  createdAt: Date;
}
