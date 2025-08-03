import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common"
import type { Reflector } from "@nestjs/core"
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator"

/**
 * 权限守卫 - 基于用户权限控制访问
 * 提供比角色更细粒度的权限控制
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * 判断用户是否具有所需权限
   * @param context 执行上下文
   * @returns 是否允许访问
   */
  canActivate(context: ExecutionContext): boolean {
    // 获取路由或控制器上标记的所需权限
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(), // 方法级别的装饰器
      context.getClass(), // 类级别的装饰器
    ])

    if (!requiredPermissions) {
      return true // 没有权限要求，允许访问
    }

    // 从请求中获取用户信息
    const { user } = context.switchToHttp().getRequest()

    // 检查用户是否拥有所有所需权限
    return requiredPermissions.every((permission) => user.permissions?.includes(permission))
  }
}
