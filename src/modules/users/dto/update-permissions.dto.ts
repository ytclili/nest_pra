import { IsArray, IsString } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

/**
 * 更新用户权限数据传输对象
 */
export class UpdatePermissionsDto {
  @ApiProperty({
    example: ["users:read", "users:write", "posts:read"],
    description: "用户权限列表",
  })
  @IsArray({ message: "权限必须是数组" })
  @IsString({ each: true, message: "每个权限必须是字符串" })
  permissions: string[]
}
