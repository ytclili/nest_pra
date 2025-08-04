import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common"
import { Repository } from "typeorm"
import { InjectRepository } from "@nestjs/typeorm"

import { User } from "./entities/user.entity"
import { CreateUserDto } from "./dto/create-user.dto"
import { UpdateUserDto } from "./dto/update-user.dto"
import { UserRole } from "./enums/user-role.enum"

/**
 * 用户服务 - 处理用户相关的业务逻辑
 * 提供用户的增删改查、权限管理等功能
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  /**
   * 创建新用户
   * @param createUserDto 用户创建数据
   * @returns 创建的用户信息（不包含密码）
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // 检查邮箱是否已存在
    const existingUser = await this.findByEmail(createUserDto.email)
    if (existingUser) {
      throw new BadRequestException("该邮箱已被注册")
    }

    // 创建用户实例
    const user = this.userRepository.create(createUserDto)

    // 保存到数据库
    const savedUser = await this.userRepository.save(user)

    // 返回用户信息（class-transformer 会自动排除 @Exclude 字段）
    return savedUser
  }

  /**
   * 获取所有用户列表（分页）
   * @param page 页码，从1开始
   * @param limit 每页数量
   * @returns 用户列表和总数
   */
  async findAll(page = 1, limit = 10): Promise<{ users: User[]; total: number }> {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit, // 跳过的记录数
      take: limit, // 获取的记录数
      order: { createdAt: "DESC" }, // 按创建时间倒序
    })

    return { users, total }
  }

  /**
   * 根据ID查找用户
   * @param id 用户ID
   * @returns 用户信息或null
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } })
  }

  /**
   * 根据邮箱查找用户
   * @param email 用户邮箱
   * @returns 用户信息或null
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } })
  }

  /**
   * 根据重置令牌查找用户
   * @param resetToken 重置令牌
   * @returns 用户信息或null
   */
  async findByResetToken(resetToken: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { resetToken },
    })
  }

  /**
   * 根据邮箱验证令牌查找用户
   * @param token 邮箱验证令牌
   * @returns 用户信息或null
   */
  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { emailVerificationToken: token },
    })
  }

  /**
   * 更新用户信息
   * @param id 用户ID
   * @param updateUserDto 更新数据
   * @returns 更新后的用户信息
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // 检查用户是否存在
    const user = await this.findById(id)
    if (!user) {
      throw new NotFoundException("用户不存在")
    }

    // 如果要更新邮箱，检查新邮箱是否已被使用
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email)
      if (existingUser) {
        throw new BadRequestException("该邮箱已被其他用户使用")
      }
    }

    // 合并更新数据
    Object.assign(user, updateUserDto)

    // 保存更新
    return this.userRepository.save(user)
  }

  /**
   * 更新用户密码
   * @param id 用户ID
   * @param hashedPassword 加密后的新密码
   */
  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.userRepository.update(id, {
      password: hashedPassword,
      // 密码更新后重置登录失败次数
      failedLoginAttempts: 0,
      lockedUntil: undefined,
    })
  }

  /**
   * 更新密码重置令牌
   * @param id 用户ID
   * @param resetToken 重置令牌
   * @param resetTokenExpiry 令牌过期时间
   */
  async updateResetToken(id: string, resetToken: string, resetTokenExpiry: Date): Promise<void> {
    await this.userRepository.update(id, {
      resetToken,
      resetTokenExpiry,
    })
  }

  /**
   * 清除密码重置令牌
   * @param id 用户ID
   */
  async clearResetToken(id: string): Promise<void> {
    await this.userRepository.update(id, {
      resetToken: undefined,
      resetTokenExpiry: undefined,
    })
  }

  /**
   * 设置邮箱验证令牌
   * @param id 用户ID
   * @param token 验证令牌
   * @param expiry 令牌过期时间
   */
  async setEmailVerificationToken(id: string, token: string, expiry: Date): Promise<void> {
    await this.userRepository.update(id, {
      emailVerificationToken: token,
      emailVerificationExpiry: expiry,
    })
  }

  /**
   * 验证用户邮箱
   * @param id 用户ID
   */
  async verifyEmail(id: string): Promise<void> {
    await this.userRepository.update(id, {
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpiry: undefined,
    })
  }

  /**
   * 更新用户角色
   * @param id 用户ID
   * @param role 新角色
   */
  async updateRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findById(id)
    if (!user) {
      throw new NotFoundException("用户不存在")
    }

    user.role = role
    return this.userRepository.save(user)
  }

  /**
   * 更新用户权限
   * @param id 用户ID
   * @param permissions 权限列表
   */
  async updatePermissions(id: string, permissions: string[]): Promise<User> {
    const user = await this.findById(id)
    if (!user) {
      throw new NotFoundException("用户不存在")
    }

    user.permissions = permissions
    return this.userRepository.save(user)
  }

  /**
   * 激活/停用用户账户
   * @param id 用户ID
   * @param isActive 是否激活
   */
  async toggleUserStatus(id: string, isActive: boolean): Promise<User> {
    const user = await this.findById(id)
    if (!user) {
      throw new NotFoundException("用户不存在")
    }

    user.isActive = isActive
    return this.userRepository.save(user)
  }

  /**
   * 记录登录失败
   * @param id 用户ID
   * @param maxAttempts 最大失败次数，默认5次
   * @param lockDuration 锁定时长（分钟），默认30分钟
   */
  async recordFailedLogin(id: string, maxAttempts = 5, lockDuration = 30): Promise<void> {
    const user = await this.findById(id)
    if (!user) return

    user.failedLoginAttempts += 1

    // 如果失败次数达到上限，锁定账户
    if (user.failedLoginAttempts >= maxAttempts) {
      user.lockedUntil = new Date(Date.now() + lockDuration * 60 * 1000)
    }

    await this.userRepository.save(user)
  }

  /**
   * 记录成功登录
   * @param id 用户ID
   * @param ip 登录IP地址
   */
  async recordSuccessfulLogin(id: string, ip?: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      failedLoginAttempts: 0, // 重置失败次数
      lockedUntil: undefined, // 解除锁定
    })
  }

  /**
   * 删除用户（软删除 - 实际上是停用账户）
   * @param id 用户ID
   */
  async remove(id: string): Promise<void> {
    const user = await this.findById(id)
    if (!user) {
      throw new NotFoundException("用户不存在")
    }

    // 软删除：停用账户而不是真正删除
    await this.toggleUserStatus(id, false)
  }

  /**
   * 硬删除用户（真正从数据库删除）
   * 谨慎使用！
   * @param id 用户ID
   */
  async hardDelete(id: string): Promise<void> {
    const result = await this.userRepository.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException("用户不存在")
    }
  }

  /**
   * 搜索用户
   * @param query 搜索关键词
   * @param page 页码
   * @param limit 每页数量
   * @returns 搜索结果
   */
  async search(query: string, page = 1, limit = 10): Promise<{ users: User[]; total: number }> {
    const queryBuilder = this.userRepository.createQueryBuilder("user")

    // 搜索邮箱、名字、姓氏
    queryBuilder.where("user.email ILIKE :query OR user.firstName ILIKE :query OR user.lastName ILIKE :query", {
      query: `%${query}%`,
    })

    // 分页
    queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy("user.createdAt", "DESC")

    const [users, total] = await queryBuilder.getManyAndCount()

    return { users, total }
  }

  /**
   * 获取用户统计信息
   * @returns 用户统计数据
   */
  async getStats(): Promise<{
    total: number
    active: number
    inactive: number
    verified: number
    unverified: number
    byRole: Record<UserRole, number>
  }> {
    const total = await this.userRepository.count()
    const active = await this.userRepository.count({ where: { isActive: true } })
    const inactive = total - active
    const verified = await this.userRepository.count({ where: { emailVerified: true } })
    const unverified = total - verified

    // 按角色统计
    const byRole: Record<UserRole, number> = {} as Record<UserRole, number>
    for (const role of Object.values(UserRole)) {
      byRole[role] = await this.userRepository.count({ where: { role } })
    }

    return {
      total,
      active,
      inactive,
      verified,
      unverified,
      byRole,
    }
  }
}
