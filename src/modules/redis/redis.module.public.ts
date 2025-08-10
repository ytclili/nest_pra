import { Module } from "@nestjs/common"
import { RedisModule } from "./redis.module"
import { RedisController } from "./redis.controller"

@Module({
  imports: [RedisModule],
  controllers: [RedisController],
})
export class RedisPublicModule {}
