import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/**
 * 当前用户装饰器
 * 用于从请求中提取当前登录用户的信息
 *
 * 使用示例：
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: User) {
 *   return user; // 返回当前登录用户信息
 * }
 *
 * 也可以提取用户的特定属性：
 * @Get('my-id')
 * getMyId(@CurrentUser('id') userId: string) {
 *   return { userId }; // 只返回用户ID
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // 由认证守卫注入的用户信息

    // 如果指定了特定属性，则返回该属性值
    return data ? user?.[data as string] : user;
  },
);
