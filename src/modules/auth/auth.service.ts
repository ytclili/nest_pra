import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';

import { UsersService } from '../users/users.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserRole } from '../users/enums/user-role.enum';

/**
 * 认证服务 - 处理所有认证相关的业务逻辑
 * 包括用户验证、令牌生成、密码管理等核心功能
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService, // 用户服务
    private readonly tokenService: TokenService, // 令牌服务
    private readonly passwordService: PasswordService, // 密码服务
    private readonly configService: ConfigService, // 配置服务
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>, // 刷新令牌仓库
  ) {}

  /**
   * 验证用户凭据（用于本地策略）
   * @param email 用户邮箱
   * @param password 用户密码
   * @returns 验证成功返回用户信息，失败返回 null
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    // 根据邮箱查找用户
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null; // 用户不存在
    }

    // 验证密码是否正确
    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      return null; // 密码错误
    }

    // 检查用户账户是否被激活
    if (!user.isActive) {
      throw new UnauthorizedException('账户已被停用');
    }

    return user; // 验证成功，返回用户信息
  }

  /**
   * 用户注册
   * @param registerDto 注册信息
   * @returns 包含用户信息和令牌的响应
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // 检查邮箱是否已被注册
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 加密密码
    const hashedPassword = await this.passwordService.hashPassword(
      registerDto.password,
    );

    // 创建新用户，默认角色为普通用户
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      role: UserRole.USER,
    });

    // 生成访问令牌和刷新令牌
    const tokens = await this.generateTokens(user);

    // 存储刷新令牌到数据库
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user), // 移除敏感信息后返回用户数据
      ...tokens,
    };
  }

  /**
   * 用户登录
   * @param user 已验证的用户信息
   * @returns 包含用户信息和令牌的响应
   */
  async login(user: User): Promise<AuthResponseDto> {
    // 生成新的令牌对
    const tokens = await this.generateTokens(user);

    // 存储刷新令牌（会覆盖旧的刷新令牌）
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * 刷新访问令牌
   * @param userId 用户ID
   * @param refreshToken 刷新令牌
   * @returns 新的令牌对
   */
  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<AuthResponseDto> {
    // 从数据库中查找刷新令牌
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { userId, token: refreshToken },
      relations: ['user'], // 关联查询用户信息
    });

    // 验证刷新令牌是否存在且未过期
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }

    const user = storedToken.user;
    // 生成新的令牌对
    const tokens = await this.generateTokens(user);

    // 删除旧的刷新令牌，存储新的刷新令牌（令牌轮换机制）
    await this.refreshTokenRepository.remove(storedToken);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * 用户登出
   * @param userId 用户ID
   */
  async logout(userId: string): Promise<void> {
    // 删除用户的所有刷新令牌，使其无法再刷新访问令牌
    await this.refreshTokenRepository.delete({ userId });
  }

  /**
   * 修改密码
   * @param userId 用户ID
   * @param changePasswordDto 密码修改信息
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    // 查找用户
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证当前密码是否正确
    const isCurrentPasswordValid = await this.passwordService.comparePassword(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('当前密码不正确');
    }

    // 加密新密码并更新
    const hashedNewPassword = await this.passwordService.hashPassword(
      changePasswordDto.newPassword,
    );
    await this.usersService.updatePassword(userId, hashedNewPassword);

    // 密码修改后，删除所有刷新令牌，强制用户重新登录
    await this.refreshTokenRepository.delete({ userId });
  }

  /**
   * 忘记密码 - 发送重置邮件
   * @param email 用户邮箱
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // 为了安全，不透露邮箱是否存在，直接返回
      return;
    }

    // 生成32字节的随机重置令牌
    const resetToken = randomBytes(32).toString('hex');
    // 设置重置令牌1小时后过期
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // 保存重置令牌到用户记录
    await this.usersService.updateResetToken(
      user.id,
      resetToken,
      resetTokenExpiry,
    );

    // TODO: 发送重置密码邮件
    // await this.emailService.sendPasswordResetEmail(user.email, resetToken);
    console.log(`密码重置令牌: ${resetToken}`); // 开发环境下打印令牌
  }

  /**
   * 重置密码
   * @param resetPasswordDto 重置密码信息
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    // 根据重置令牌查找用户
    const user = await this.usersService.findByResetToken(
      resetPasswordDto.token,
    );
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('重置令牌无效或已过期');
    }

    // 加密新密码并更新
    const hashedPassword = await this.passwordService.hashPassword(
      resetPasswordDto.newPassword,
    );
    await this.usersService.updatePassword(user.id, hashedPassword);

    // 清除重置令牌
    await this.usersService.clearResetToken(user.id);

    // 密码重置后，删除所有刷新令牌，强制用户重新登录
    await this.refreshTokenRepository.delete({ userId: user.id });
  }

  /**
   * 生成访问令牌和刷新令牌
   * @param user 用户信息
   * @returns 令牌对象
   */
  private async generateTokens(user: User) {
    // JWT 载荷信息
    const payload = {
      sub: user.id, // 用户ID
      email: user.email, // 用户邮箱
      role: user.role, // 用户角色
      permissions: user.permissions || [], // 用户权限列表
    };

    // 并行生成访问令牌和刷新令牌
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.generateAccessToken(payload),
      this.tokenService.generateRefreshToken(payload),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'), // 访问令牌过期时间
    };
  }

  /**
   * 存储刷新令牌到数据库
   * @param userId 用户ID
   * @param token 刷新令牌
   */
  private async storeRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    // 设置刷新令牌7天后过期
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // 创建刷新令牌记录
    const refreshTokenRecord = this.refreshTokenRepository.create({
      userId,
      token,
      expiresAt,
    });

    // 保存到数据库
    await this.refreshTokenRepository.save(refreshTokenRecord);
  }

  /**
   * 清理用户敏感信息
   * @param user 用户对象
   * @returns 清理后的用户信息
   */
  private sanitizeUser(user: User) {
    // 移除密码、重置令牌等敏感信息
    const { password, resetToken, resetTokenExpiry, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}
