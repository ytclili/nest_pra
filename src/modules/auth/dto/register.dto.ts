import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

/**
 * 用户注册数据传输对象
 * 定义注册时需要的字段和验证规则
 */
export class RegisterDto {
  @ApiProperty({ example: "张三", description: "用户名字" })
  @IsNotEmpty({ message: "名字不能为空" })
  @IsString({ message: "名字必须是字符串" })
  @MaxLength(50, { message: "名字长度不能超过50个字符" })
  firstName: string

  @ApiProperty({ example: "李", description: "用户姓氏" })
  @IsNotEmpty({ message: "姓氏不能为空" })
  @IsString({ message: "姓氏必须是字符串" })
  @MaxLength(50, { message: "姓氏长度不能超过50个字符" })
  lastName: string

  @ApiProperty({ example: "zhangsan@example.com", description: "用户邮箱" })
  @IsEmail({}, { message: "请输入有效的邮箱地址" })
  @IsNotEmpty({ message: "邮箱不能为空" })
  email: string

  @ApiProperty({
    example: "SecurePass123!",
    description: "密码必须包含至少8个字符，包括大写字母、小写字母、数字和特殊字符",
  })
  @IsNotEmpty({ message: "密码不能为空" })
  @IsString({ message: "密码必须是字符串" })
  @MinLength(8, { message: "密码长度至少8个字符" })
  @MaxLength(128, { message: "密码长度不能超过128个字符" })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: "密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符",
  })
  password: string
}
