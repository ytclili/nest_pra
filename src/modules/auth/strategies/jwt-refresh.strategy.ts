import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import type { ConfigService } from "@nestjs/config"
import type { Request } from "express"

import type { UsersService } from "../../users/users.service"

/**
 * JWT 刷新令牌策略 - 用于验证刷新令牌
 * 专门用于令牌刷新接口，使用不同的密钥验证
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      // 从请求头的 Authorization Bearer 中提取 JWT
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // 不忽略过期时间
      secretOrKey: configService.get("JWT_REFRESH_SECRET"), // 使用刷新令牌专用密钥
      passReqToCallback: true, // 将原始请求对象传递给 validate 方法
    })
  }

  /**
   * 验证刷新令牌载荷
   * @param req 原始请求对象
   * @param payload JWT 解码后的载荷数据
   * @returns 包含用户信息和刷新令牌的对象
   * @throws 用户不存在或被禁用时抛出未授权异常
   */
  async validate(req: Request, payload: any) {
    // 从请求头中提取刷新令牌
    const refreshToken = req.get("Authorization")?.replace("Bearer", "").trim()

    // 根据载荷中的用户ID查找用户
    const user = await this.usersService.findById(payload.sub)

    // 检查用户是否存在且账户是否激活
    if (!user || !user.isActive) {
      throw new UnauthorizedException("用户不存在或账户已被禁用")
    }

    // 返回用户信息和刷新令牌，供后续处理使用
    return { ...user, refreshToken }
  }
}
