import { Injectable, type ExecutionContext } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import type { Reflector } from "@nestjs/core"
import { IS_PUBLIC_KEY } from "../decorators/public.decorator"

/**
 * JWT 认证守卫 - 保护需要认证的路由
 * 继承自 Passport 的 AuthGuard，使用 JWT 策略
 * 支持通过 @Public() 装饰器跳过认证
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super()
  }

  /**
   * 判断是否可以激活路由（是否允许访问）
   * @param context 执行上下文
   * @returns 是否允许访问
   */
  canActivate(context: ExecutionContext) {
    // 检查路由或控制器是否标记为公开访问
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // 方法级别的装饰器
      context.getClass(), // 类级别的装饰器
    ])
    console.log("isPublic", isPublic)

    if (isPublic) {
      return true // 公开路由，直接允许访问
    }

    // 非公开路由，执行 JWT 认证
    return super.canActivate(context)
  }
}
