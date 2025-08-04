import { PartialType } from "@nestjs/swagger"
import { IsOptional, IsBoolean } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { CreateUserDto } from "./create-user.dto"

/**
 * 更新用户数据传输对象
 * 继承自创建用户DTO，所有字段都是可选的
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ example: true, description: "账户是否激活", required: false })
  @IsOptional()
  @IsBoolean({ message: "账户状态必须是布尔值" })
  isActive?: boolean

  @ApiProperty({ example: true, description: "邮箱是否已验证", required: false })
  @IsOptional()
  @IsBoolean({ message: "邮箱验证状态必须是布尔值" })
  emailVerified?: boolean
}
