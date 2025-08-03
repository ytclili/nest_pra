import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus, Get } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import { Throttle } from "@nestjs/throttler"

import type { AuthService } from "./auth.service"
import { JwtAuthGuard } from "./guards/jwt-auth.guard"
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard"
import type { RegisterDto } from "./dto/register.dto"
import type { ChangePasswordDto } from "./dto/change-password.dto"
import type { ForgotPasswordDto } from "./dto/forgot-password.dto"
import type { ResetPasswordDto } from "./dto/reset-password.dto"
import { CurrentUser } from "../../common/decorators/current-user.decorator"
import type { User } from "../users/entities/user.entity"
import { AuthResponseDto } from "./dto/auth-response.dto"

/**
 * 认证控制器 - 处理所有认证相关的 HTTP 请求
 * 包括注册、登录、令牌刷新、密码管理等功能
 */
@ApiTags("Authentication") // Swagger 文档标签
@Controller("auth") // 路由前缀为 /auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户注册接口
   * POST /auth/register
   */
  @Post("register")
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 限流：每分钟最多3次请求，防止恶意注册
  @ApiOperation({ summary: "注册新用户" })
  @ApiResponse({ status: 201, description: "用户注册成功", type: AuthResponseDto })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto)
  }

  /**
   * 用户登录接口
   * POST /auth/login
   * 使用 LocalAuthGuard 验证用户名密码
   */
  @Post('login')
  @HttpCode(HttpStatus.OK) // 返回 200 状态码而不是默认的 201
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 限流：每分钟最多5次登录尝试
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功', type: AuthResponseDto })
  async login(@Request() req): Promise<AuthResponseDto> {
    // req.user 是由 LocalAuthGuard 验证后注入的用户信息
    return this.authService.login(req.user);
  }

  /**
   * 刷新访问令牌接口
   * POST /auth/refresh
   * 使用刷新令牌获取新的访问令牌
   */
  @UseGuards(JwtRefreshGuard) // 使用刷新令牌守卫
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiResponse({ status: 200, description: '令牌刷新成功', type: AuthResponseDto })
  async refresh(@Request() req): Promise<AuthResponseDto> {
    // 使用用户ID和刷新令牌生成新的令牌对
    return this.authService.refreshTokens(req.user.id, req.user.refreshToken);
  }

  /**
   * 用户登出接口
   * POST /auth/logout
   * 清除用户的刷新令牌
   */
  @UseGuards(JwtAuthGuard) // 需要有效的访问令牌
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth() // Swagger 文档中显示需要 Bearer Token
  @ApiOperation({ summary: '用户登出' })
  @ApiResponse({ status: 200, description: '登出成功' })
  async logout(@CurrentUser() user: User): Promise<{ message: string }> {
    // 删除用户的所有刷新令牌，使其无法再刷新访问令牌
    await this.authService.logout(user.id);
    return { message: '登出成功' };
  }

  /**
   * 获取当前用户信息接口
   * GET /auth/profile
   */
  @UseGuards(JwtAuthGuard) // 需要有效的访问令牌
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '用户信息获取成功' })
  getProfile(@CurrentUser() user: User) {
    // @CurrentUser() 装饰器从请求中提取当前用户信息
    return user;
  }

  /**
   * 修改密码接口
   * POST /auth/change-password
   * 需要提供当前密码和新密码
   */
  @UseGuards(JwtAuthGuard) // 需要登录
  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "修改用户密码" })
  @ApiResponse({ status: 200, description: "密码修改成功" })
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(user.id, changePasswordDto)
    return { message: "密码修改成功" }
  }

  /**
   * 忘记密码接口
   * POST /auth/forgot-password
   * 发送密码重置邮件
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 2, ttl: 300000 } }) // 限流：5分钟内最多2次请求，防止邮件轰炸
  @ApiOperation({ summary: '请求密码重置' })
  @ApiResponse({ status: 200, description: '密码重置邮件已发送' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(forgotPasswordDto.email);
    // 为了安全，不管邮箱是否存在都返回相同消息
    return { message: '如果邮箱存在，密码重置链接已发送' };
  }

  /**
   * 重置密码接口
   * POST /auth/reset-password
   * 使用重置令牌设置新密码
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '使用重置令牌重置密码' })
  @ApiResponse({ status: 200, description: '密码重置成功' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(resetPasswordDto);
    return { message: '密码重置成功' };
  }
}
