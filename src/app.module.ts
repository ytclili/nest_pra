import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggerModule } from './common/logger/logger.module';
import { RabbitMQModule } from "./modules/rabbitmq/rabbitmq.module"

@Module({
  imports: [
    // 日志模块（全局）
    LoggerModule,
    // 配置模块 - 全局可用，从环境变量读取配置
    ConfigModule.forRoot({
      isGlobal: true, // 全局模块，其他模块无需重复导入
      envFilePath: ['.env.local', '.env'], // 环境变量文件路径，优先级从左到右
      cache: true, // 缓存环境变量，提高性能
    }),
    // 限流模块 - 防止API滥用
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get('THROTTLE_TTL', 60000), // 时间窗口，默认60秒
          limit: configService.get('THROTTLE_LIMIT', 10), // 请求限制，默认10次
        },
      ],
    }),
    // TypeORM 数据库模块 - 异步配置
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // 调试输出
        console.log('当前DB_HOST:', configService.get('DB_HOST'));
        console.log('所有环境变量:', configService.get('DB_PORT'));
        return {
          type: 'mysql', // 改为 mysql
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get('DB_PORT', 3306), // MySQL 默认端口 3306
          username: configService.get('DB_USERNAME', 'root'), // MySQL 默认用户名
          password: configService.get('DB_PASSWORD', 'password'),
          database: configService.get('DB_NAME', 'test'),

          // 自动加载实体
          entities: [__dirname + '/**/*.entity{.ts,.js}'],

          // 开发环境配置
          synchronize: false, // 暂时禁用自动同步，避免重复索引错误
          logging: configService.get('NODE_ENV') === 'development', // 仅开发环境显示SQL日志

          // MySQL 特定配置
          charset: 'utf8mb4', // 支持 emoji 和完整的 UTF-8
          timezone: '+08:00', // 设置时区为中国时区

          // 连接池配置
          extra: {
            connectionLimit: configService.get('DB_MAX_CONNECTIONS', 10), // 最大连接数
            acquireTimeout: configService.get('DB_CONNECTION_TIMEOUT', 60000), // 连接超时
            timeout: 60000, // 查询超时
          },
        };
      },
    }),
    // 业务模块
    UsersModule, // 用户模块（必须在认证模块之前，因为认证模块依赖用户模块）
    AuthModule, // 认证模块

    // RabbitMQ模块
    RabbitMQModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
