import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger"

import type { UsersService } from "./users.service"
import type { CreateUserDto } from "./dto/create-user.dto"
import type { UpdateUserDto } from "./dto/update-user.dto"
import type { UpdateRoleDto } from "./dto/update-role.dto"
import type { UpdatePermissionsDto } from "./dto/update-permissions.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { CurrentUser } from "../../common/decorators/current-user.decorator"
import { UserRole } from "./enums/user-role.enum"
import type { User } from "./entities/user.entity"

/**
 * 用户控制器 - 处理用户相关的HTTP请求
 * 提供用户管理的REST API接口
 */
@ApiTags("Users") // Swagger文档标签
@Controller("users") // 路由前缀 /users
@UseGuards(JwtAuthGuard) // 所有接口都需要JWT认证
@ApiBearerAuth() // Swagger文档显示需要Bearer Token
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 创建新用户（仅管理员）
   * POST /users
   */
  @Post()
  @UseGuards(RolesGuard) // 使用角色守卫
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) // 只有管理员可以创建用户
  @ApiOperation({ summary: '创建新用户（仅管理员）' })
  @ApiResponse({ status: 201, description: '用户创建成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto)
  }

  /**
   * 获取用户列表（分页）
   * GET /users?page=1&limit=10
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR) // 管理员和版主可以查看用户列表
  @ApiOperation({ summary: "获取用户列表（分页）" })
  @ApiQuery({ name: "page", required: false, description: "页码，从1开始", example: 1 })
  @ApiQuery({ name: "limit", required: false, description: "每页数量", example: 10 })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll(page, limit)
  }

  /**
   * 搜索用户
   * GET /users/search?q=关键词&page=1&limit=10
   */
  @Get("search")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: "搜索用户" })
  @ApiQuery({ name: "q", description: "搜索关键词" })
  @ApiQuery({ name: "page", required: false, description: "页码", example: 1 })
  @ApiQuery({ name: "limit", required: false, description: "每页数量", example: 10 })
  @ApiResponse({ status: 200, description: "搜索结果" })
  async search(
    @Query('q') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.search(query, page, limit)
  }

  /**
   * 获取用户统计信息
   * GET /users/stats
   */
  @Get("stats")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "获取用户统计信息（仅管理员）" })
  @ApiResponse({ status: 200, description: "统计信息获取成功" })
  async getStats() {
    return this.usersService.getStats()
  }

  /**
   * 获取当前用户信息
   * GET /users/me
   */
  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '用户信息获取成功' })
  getProfile(@CurrentUser() user: User) {
    return user
  }

  /**
   * 根据ID获取用户信息
   * GET /users/:id
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: '根据ID获取用户信息' })
  @ApiResponse({ status: 200, description: '用户信息获取成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id)
    if (!user) {
      throw new NotFoundException('用户不存在')
    }
    return user
  }

  /**
   * 更新当前用户信息
   * PATCH /users/me
   */
  @Patch("me")
  @ApiOperation({ summary: "更新当前用户信息" })
  @ApiResponse({ status: 200, description: "用户信息更新成功" })
  async updateProfile(@CurrentUser() user: User, @Body() updateUserDto: UpdateUserDto) {
    // 普通用户只能更新自己的基本信息，不能更新角色和权限
    const { role, permissions, isActive, ...allowedUpdates } = updateUserDto
    return this.usersService.update(user.id, allowedUpdates)
  }

  /**
   * 更新指定用户信息（仅管理员）
   * PATCH /users/:id
   */
  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "更新指定用户信息（仅管理员）" })
  @ApiResponse({ status: 200, description: "用户信息更新成功" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto)
  }

  /**
   * 更新用户角色（仅超级管理员）
   * PATCH /users/:id/role
   */
  @Patch(":id/role")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN) // 只有超级管理员可以修改角色
  @ApiOperation({ summary: "更新用户角色（仅超级管理员）" })
  @ApiResponse({ status: 200, description: "用户角色更新成功" })
  async updateRole(@Param('id', ParseUUIDPipe) id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.usersService.updateRole(id, updateRoleDto.role)
  }

  /**
   * 更新用户权限（仅管理员）
   * PATCH /users/:id/permissions
   */
  @Patch(":id/permissions")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "更新用户权限（仅管理员）" })
  @ApiResponse({ status: 200, description: "用户权限更新成功" })
  async updatePermissions(@Param('id', ParseUUIDPipe) id: string, @Body() updatePermissionsDto: UpdatePermissionsDto) {
    return this.usersService.updatePermissions(id, updatePermissionsDto.permissions)
  }

  /**
   * 激活/停用用户账户（仅管理员）
   * PATCH /users/:id/status
   */
  @Patch(":id/status")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "激活/停用用户账户（仅管理员）" })
  @ApiResponse({ status: 200, description: "用户状态更新成功" })
  async toggleStatus(@Param('id', ParseUUIDPipe) id: string, @Body('isActive') isActive: boolean) {
    return this.usersService.toggleUserStatus(id, isActive)
  }

  /**
   * 删除用户（软删除，仅管理员）
   * DELETE /users/:id
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '删除用户（软删除，仅管理员）' })
  @ApiResponse({ status: 200, description: '用户删除成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id)
    return { message: '用户删除成功' }
  }
}
