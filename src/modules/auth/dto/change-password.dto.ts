import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 修改密码数据传输对象
 * 用于用户修改密码时的数据验证
 */
export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsNotEmpty({ message: '当前密码不能为空' })
  @IsString({ message: '当前密码必须是字符串' })
  currentPassword: string;

  @ApiProperty({
    description:
      '新密码必须包含至少8个字符，包括大写字母、小写字母、数字和特殊字符',
  })
  @IsNotEmpty({ message: '新密码不能为空' })
  @IsString({ message: '新密码必须是字符串' })
  @MinLength(8, { message: '新密码长度至少8个字符' })
  @MaxLength(128, { message: '新密码长度不能超过128个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      '新密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符',
  })
  newPassword: string;
}
