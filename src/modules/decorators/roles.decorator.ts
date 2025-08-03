import { SetMetadata } from "@nestjs/common"
import type { UserRole } from "../../users/enums/user-role.enum"

// 角色元数据键
export const ROLES_KEY = "roles"

/**
 * 角色装饰器
 * 用于标记访问路由所需的用户角色
 *
 * 使用示例：
 * @Roles(UserRole.ADMIN, UserRole.MODERATOR)
 * @Get('admin-only')
 * adminOnlyEndpoint() {
 *   return { message: '只有管理员可以访问' }
 * }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)
