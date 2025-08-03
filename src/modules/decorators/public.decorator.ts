import { SetMetadata } from "@nestjs/common"

// 公开路由标识键
export const IS_PUBLIC_KEY = "isPublic"

/**
 * 公开访问装饰器
 * 用于标记不需要认证的路由
 *
 * 使用示例：
 * @Public()
 * @Get('public-info')
 * getPublicInfo() {
 *   return { message: '这是公开信息' }
 * }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
