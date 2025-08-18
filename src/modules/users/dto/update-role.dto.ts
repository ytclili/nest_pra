import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';

/**
 * 更新用户角色数据传输对象
 */
export class UpdateRoleDto {
  @ApiProperty({
    example: UserRole.ADMIN,
    description: '新的用户角色',
    enum: UserRole,
  })
  @IsNotEmpty({ message: '角色不能为空' })
  @IsEnum(UserRole, { message: '无效的用户角色' })
  role: UserRole;
}
