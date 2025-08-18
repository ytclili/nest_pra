import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

/**
 * 用户模块 - 管理用户相关的所有功能
 * 包括用户的增删改查、用户信息管理等
 */
@Module({
  imports: [
    // 注册用户实体到 TypeORM
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [UsersController], // 用户控制器
  providers: [UsersService], // 用户服务
  exports: [UsersService], // 导出用户服务供其他模块使用（如认证模块）
})
export class UsersModule {}
