import { SetMetadata } from '@nestjs/common';

// 权限元数据键
export const PERMISSIONS_KEY = 'permissions';

/**
 * 权限装饰器
 * 用于标记访问路由所需的具体权限
 *
 * 使用示例：
 * @RequirePermissions('users:read', 'users:write')
 * @Get('users')
 * getUsers() {
 *   return { message: '需要用户读写权限' }
 * }
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
