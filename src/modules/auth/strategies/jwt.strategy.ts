import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import type { ConfigService } from "@nestjs/config"

import type { UsersService } from "../../users/users.service"

/**
 * JWT 认证策略 - 用于验证访问令牌
 * 当用户访问受保护的路由时，会自动执行此策略
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      // 从请求头的 Authorization Bearer 中提取 JWT
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // 不忽略过期时间，过期的令牌会被拒绝
      secretOrKey: configService.get("JWT_SECRET"), // JWT 验证密钥
    })
  }

  /**
   * 验证 JWT 载荷
   * @param payload JWT 解码后的载荷数据
   * @returns 用户信息（会被注入到 request.user）
   * @throws 用户不存在或被禁用时抛出未授权异常
   */
  async validate(payload: any) {
    // 根据载荷中的用户ID查找用户
    const user = await this.usersService.findById(payload.sub)

    // 检查用户是否存在且账户是否激活
    if (!user || !user.isActive) {
      throw new UnauthorizedException("用户不存在或账户已被禁用")
    }

    // 返回用户信息，会被自动注入到 request.user
    return user
  }
}
