import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  // 获取配置服务
  const configService = app.get(ConfigService);
  // 设置全局路由前缀
  app.setGlobalPrefix('api/v1');
  // CORS 配置 - 允许跨域请求
  app.enableCors({
    origin: [
      'http://localhost:3000', // React开发服务器
      'http://localhost:3001', // 备用前端端口
      configService.get('FRONTEND_URL', 'http://localhost:3000'), // 从环境变量读取
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true, // 允许携带认证信息
  });

  // 全局验证管道配置
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动移除DTO中未定义的属性
      forbidNonWhitelisted: true, // 如果有未定义属性则抛出错误
      transform: true, // 自动转换数据类型
      disableErrorMessages: configService.get('NODE_ENV') === 'production', // 生产环境隐藏详细错误
      transformOptions: {
        enableImplicitConversion: true, // 启用隐式类型转换
      },
    }),
  );

  // Swagger API 文档配置
  const config = new DocumentBuilder()
    .setTitle('NestJS 认证系统 API')
    .setDescription('基于 NestJS 的完整认证和用户管理系统')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '请输入JWT令牌',
        in: 'header',
      },
      'JWT-auth', // 这个名字要和控制器中的 @ApiBearerAuth() 对应
    )
    .addTag('Authentication', '认证相关接口')
    .addTag('Users', '用户管理接口')
    .addTag('Application', '应用基础接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 保持认证状态
      tagsSorter: 'alpha', // 按字母顺序排序标签
      operationsSorter: 'alpha', // 按字母顺序排序操作
    },
    customSiteTitle: 'NestJS 认证系统 API 文档',
  });

  if (configService.get('NODE_ENV') !== 'production') {
    logger.log('📚 Swagger文档已启用: http://localhost:3000/api/docs');
  }
  // 启动应用
  const port = configService.get('PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 应用已启动: http://localhost:${port}`);
  logger.log(`🌍 环境: ${configService.get('NODE_ENV', 'development')}`);
  logger.log(`📊 健康检查: http://localhost:${port}/api/v1`);

  // 优雅关闭处理
  process.on('SIGTERM', async () => {
    logger.log('收到 SIGTERM 信号，正在优雅关闭...');
    await app.close();
  });
}
// 启动应用并处理错误
bootstrap().catch((error) => {
  Logger.error('应用启动失败:', error);
  process.exit(1);
});
