import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from "typeorm"
import { Exclude } from "class-transformer"
import { ApiProperty } from "@nestjs/swagger"

import { UserRole } from "../enums/user-role.enum"
import { RefreshToken } from "../../auth/entities/refresh-token.entity"

/**
 * 用户实体 - 定义用户数据表结构
 * 包含用户的基本信息、认证信息、角色权限等
 */
@Entity("users") // 数据库表名为 users
// @Index(["email"], { unique: true }) // 为邮箱字段创建唯一索引
export class User {
  @ApiProperty({ description: "用户唯一标识符" })
  @PrimaryGeneratedColumn("uuid") // 使用 UUID 作为主键
  id: string

  @ApiProperty({ description: "用户邮箱", example: "user@example.com" })
  @Column({ unique: true, length: 255 }) // 邮箱唯一且限制长度
  email: string

  @ApiProperty({ description: "用户名字", example: "张三" })
  @Column({ name: "first_name", length: 50 })
  firstName: string

  @ApiProperty({ description: "用户姓氏", example: "李" })
  @Column({ name: "last_name", length: 50 })
  lastName: string

  /**
   * 用户密码 - 使用 @Exclude() 装饰器确保在序列化时不会暴露密码
   * 即使意外返回了用户对象，密码也不会被包含在响应中
   */
  @Column()
  @Exclude() // 在 JSON 序列化时排除此字段
  password: string

  @ApiProperty({ description: "用户角色", enum: UserRole })
  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER, // 默认角色为普通用户
  })
  role: UserRole

  @ApiProperty({ description: "用户权限列表", example: ["users:read", "posts:write"] })
  @Column("simple-array", { nullable: true }) // 存储为逗号分隔的字符串
  permissions: string[]

  @ApiProperty({ description: "账户是否激活", example: true })
  @Column({ name: "is_active", default: true })
  isActive: boolean

  @ApiProperty({ description: "邮箱是否已验证", example: false })
  @Column({ name: "email_verified", default: false })
  emailVerified: boolean

  @ApiProperty({ description: "用户头像URL", example: "https://example.com/avatar.jpg" })
  @Column({ name: "avatar_url", nullable: true })
  avatarUrl?: string

  @ApiProperty({ description: "用户电话号码", example: "+86 138 0013 8000" })
  @Column({ name: "phone_number", nullable: true })
  phoneNumber?: string

  @ApiProperty({ description: "用户生日", example: "1990-01-01" })
  @Column({ type: "date", nullable: true })
  birthday?: Date

  @ApiProperty({ description: "用户性别", example: "male" })
  @Column({ nullable: true })
  gender?: string

  @ApiProperty({ description: "用户地址", example: "北京市朝阳区" })
  @Column({ nullable: true })
  address?: string

  /**
   * 密码重置相关字段
   * 用于忘记密码功能
   */
  @Column({ name: "reset_token", nullable: true })
  @Exclude() // 重置令牌也需要排除
  resetToken?: string

  @Column({ name: "reset_token_expiry", nullable: true })
  @Exclude() // 重置令牌过期时间也需要排除
  resetTokenExpiry?: Date

  /**
   * 邮箱验证相关字段
   */
  @Column({ name: "email_verification_token", nullable: true })
  @Exclude()
  emailVerificationToken?: string

  @Column({ name: "email_verification_expiry", nullable: true })
  @Exclude()
  emailVerificationExpiry?: Date

  /**
   * 最后登录时间和IP
   * 用于安全审计
   */
  @ApiProperty({ description: "最后登录时间" })
  @Column({ name: "last_login_at", nullable: true })
  lastLoginAt?: Date

  @Column({ name: "last_login_ip", nullable: true })
  lastLoginIp?: string

  /**
   * 登录失败次数
   * 用于账户锁定功能
   */
  @Column({ name: "failed_login_attempts", default: 0 })
  failedLoginAttempts: number

  @Column({ name: "locked_until", nullable: true })
  lockedUntil?: Date

  @ApiProperty({ description: "账户创建时间" })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date

  @ApiProperty({ description: "账户最后更新时间" })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date

  /**
   * 一对多关系：一个用户可以有多个刷新令牌
   * 支持多设备登录
   */
  @OneToMany(
    () => RefreshToken,
    (refreshToken) => refreshToken.user,
  )
  refreshTokens: RefreshToken[]

  /**
   * 虚拟字段：用户全名
   * 不存储在数据库中，而是通过计算得出
   */
  @ApiProperty({ description: "用户全名", example: "张三" })
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim()
  }

  /**
   * 虚拟字段：账户是否被锁定
   */
  get isLocked(): boolean {
    return this.lockedUntil ? this.lockedUntil > new Date() : false
  }
}
