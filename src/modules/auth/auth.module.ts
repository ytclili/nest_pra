import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';

/**
 * 认证模块 - 负责用户认证和授权的核心模块
 * 包含登录、注册、令牌管理等功能
 */
@Module({
  imports: [
    ConfigModule, // 配置模块，用于读取环境变量
    UsersModule, // 用户模块，提供用户相关服务

    // Passport 模块配置，设置默认认证策略为 JWT
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT 模块异步配置，从环境变量读取密钥和过期时间
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'), // JWT 密钥
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '15m'), // 默认15分钟过期
        },
      }),
    }),

    // TypeORM 模块，注册刷新令牌实体
    TypeOrmModule.forFeature([RefreshToken]),
  ],
  controllers: [AuthController], // 注册认证控制器
  providers: [
    AuthService, // 认证服务
    TokenService, // 令牌服务
    PasswordService, // 密码服务
    JwtStrategy, // JWT 认证策略
    LocalStrategy, // 本地认证策略（用户名密码）
    JwtRefreshStrategy, // JWT 刷新令牌策略
  ],
  exports: [AuthService, TokenService, PasswordService], // 导出服务供其他模块使用
})
export class AuthModule {}
