import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * 密码服务 - 负责密码的加密、验证和生成
 * 使用 bcrypt 算法确保密码安全
 */
@Injectable()
export class PasswordService {
  private readonly saltRounds = 12; // 盐值轮数，数值越高越安全但计算越慢

  /**
   * 加密密码
   * @param password 明文密码
   * @returns 加密后的密码哈希
   */
  async hashPassword(password: string): Promise<string> {
    // 使用 bcrypt 生成盐值并加密密码
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * 验证密码
   * @param password 明文密码
   * @param hashedPassword 加密后的密码哈希
   * @returns 密码是否匹配
   */
  async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    // 使用 bcrypt 比较明文密码和哈希值
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * 生成随机密码
   * @param length 密码长度，默认12位
   * @returns 随机生成的密码
   */
  generateRandomPassword(length = 12): string {
    // 包含大小写字母、数字和特殊字符的字符集
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // 随机选择字符组成密码
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }
}
