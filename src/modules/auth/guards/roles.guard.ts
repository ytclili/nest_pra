import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common"
import type { Reflector } from "@nestjs/core"
import { ROLES_KEY } from "../decorators/roles.decorator"
import type { UserRole } from "../../users/enums/user-role.enum"

/**
 * 角色守卫 - 基于用户角色控制访问权限
 * 检查用户是否具有访问特定路由所需的角色
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * 判断用户是否具有所需角色
   * @param context 执行上下文
   * @returns 是否允许访问
   */
  canActivate(context: ExecutionContext): boolean {
    // 获取路由或控制器上标记的所需角色
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(), // 方法级别的装饰器
      context.getClass(), // 类级别的装饰器
    ])

    if (!requiredRoles) {
      return true // 没有角色要求，允许访问
    }

    // 从请求中获取用户信息（由 JWT 守卫注入）
    const { user } = context.switchToHttp().getRequest()

    // 检查用户角色是否在所需角色列表中
    return requiredRoles.some((role) => user.role === role)
  }
}
