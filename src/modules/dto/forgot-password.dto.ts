import { IsEmail, IsNotEmpty } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class ForgotPasswordDto {
  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string
}
