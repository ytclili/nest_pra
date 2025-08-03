import { Injectable } from "@nestjs/common"
import type { JwtService } from "@nestjs/jwt"
import type { ConfigService } from "@nestjs/config"

/**
 * 令牌服务 - 负责 JWT 令牌的生成、验证和解码
 * 提供访问令牌和刷新令牌的管理功能
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService, // NestJS JWT 服务
    private readonly configService: ConfigService, // 配置服务
  ) {}

  /**
   * 生成访问令牌（短期有效）
   * @param payload JWT 载荷数据
   * @returns 访问令牌字符串
   */
  async generateAccessToken(payload: any): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get("JWT_SECRET"), // 访问令牌密钥
      expiresIn: this.configService.get("JWT_EXPIRES_IN", "15m"), // 默认15分钟过期
    })
  }

  /**
   * 生成刷新令牌（长期有效）
   * @param payload JWT 载荷数据
   * @returns 刷新令牌字符串
   */
  async generateRefreshToken(payload: any): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get("JWT_REFRESH_SECRET"), // 刷新令牌密钥（与访问令牌不同）
      expiresIn: this.configService.get("JWT_REFRESH_EXPIRES_IN", "7d"), // 默认7天过期
    })
  }

  /**
   * 验证令牌有效性
   * @param token 要验证的令牌
   * @param secret 可选的密钥，不提供则使用默认访问令牌密钥
   * @returns 解码后的载荷数据
   * @throws 令牌无效或过期时抛出异常
   */
  async verifyToken(token: string, secret?: string): Promise<any> {
    return this.jwtService.verifyAsync(token, {
      secret: secret || this.configService.get("JWT_SECRET"),
    })
  }

  /**
   * 解码令牌（不验证签名和过期时间）
   * @param token 要解码的令牌
   * @returns 解码后的载荷数据
   */
  async decodeToken(token: string): Promise<any> {
    return this.jwtService.decode(token)
  }
}
