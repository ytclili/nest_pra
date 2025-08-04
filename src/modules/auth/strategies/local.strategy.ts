import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { Strategy } from "passport-local"

import  { AuthService } from "../auth.service"

/**
 * 本地认证策略 - 用于用户名密码登录
 * 在用户登录时验证邮箱和密码的正确性
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: "email", // 使用 email 字段作为用户名（默认是 username）
    })
  }

  /**
   * 验证用户凭据
   * @param email 用户邮箱
   * @param password 用户密码
   * @returns 验证成功返回用户信息
   * @throws 验证失败抛出未授权异常
   */
  async validate(email: string, password: string): Promise<any> {
    // 调用认证服务验证用户凭据
    const user = await this.authService.validateUser(email, password)

    if (!user) {
      // 验证失败，抛出未授权异常
      throw new UnauthorizedException("邮箱或密码错误")
    }

    // 验证成功，返回用户信息（会被注入到 request.user）
    return user
  }
}
