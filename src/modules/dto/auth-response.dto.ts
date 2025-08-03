import { ApiProperty } from "@nestjs/swagger"
import type { User } from "../../users/entities/user.entity"

export class AuthResponseDto {
  @ApiProperty()
  user: Partial<User>

  @ApiProperty()
  accessToken: string

  @ApiProperty()
  refreshToken: string

  @ApiProperty()
  expiresIn: string
}
