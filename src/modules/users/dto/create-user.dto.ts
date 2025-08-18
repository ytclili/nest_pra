import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';

/**
 * 创建用户数据传输对象
 * 定义创建用户时需要的字段和验证规则
 */
export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: '用户邮箱' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({ example: '张三', description: '用户名字' })
  @IsNotEmpty({ message: '名字不能为空' })
  @IsString({ message: '名字必须是字符串' })
  @MaxLength(50, { message: '名字长度不能超过50个字符' })
  firstName: string;

  @ApiProperty({ example: '李', description: '用户姓氏' })
  @IsNotEmpty({ message: '姓氏不能为空' })
  @IsString({ message: '姓氏必须是字符串' })
  @MaxLength(50, { message: '姓氏长度不能超过50个字符' })
  lastName: string;

  @ApiProperty({ example: 'hashedPassword123', description: '加密后的密码' })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须是字符串' })
  password: string;

  @ApiProperty({
    example: UserRole.USER,
    description: '用户角色',
    enum: UserRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: '无效的用户角色' })
  role?: UserRole;

  @ApiProperty({
    example: ['users:read', 'posts:write'],
    description: '用户权限列表',
    required: false,
  })
  @IsOptional()
  @IsArray({ message: '权限必须是数组' })
  @IsString({ each: true, message: '每个权限必须是字符串' })
  permissions?: string[];

  @ApiProperty({
    example: '+86 138 0013 8000',
    description: '电话号码',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '电话号码必须是字符串' })
  phoneNumber?: string;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: '头像URL',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '头像URL必须是字符串' })
  avatarUrl?: string;

  @ApiProperty({
    example: '北京市朝阳区',
    description: '地址',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '地址必须是字符串' })
  address?: string;

  @ApiProperty({ example: 'male', description: '性别', required: false })
  @IsOptional()
  @IsString({ message: '性别必须是字符串' })
  gender?: string;
}
