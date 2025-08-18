import { Injectable, type LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { Request } from 'express';

/**
 * 自定义日志服务
 * 支持多种日志级别、文件轮转、结构化日志等功能
 * 特别针对 Docker 环境优化
 */
@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements LoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(private readonly configService: ConfigService) {
    this.createLogger();
  }

  /**
   * 设置日志上下文
   */
  setContext(context: string) {
    this.context = context;
  }

  /**
   * 创建 Winston 日志器
   */
  private createLogger() {
    const logLevel = this.configService.get('LOG_LEVEL', 'info');
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    const appName = this.configService.get('APP_NAME', 'nestjs-auth');

    // 自定义日志格式
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(
        ({
          timestamp,
          level,
          message,
          context,
          trace,
          requestId,
          userId,
          ip,
          userAgent,
          ...meta
        }) => {
          const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            service: appName,
            context: context || this.context,
            message,
            ...(typeof requestId === 'string' ? { requestId } : {}),
            ...(typeof userId === 'string' ? { userId } : {}),
            ...(typeof ip === 'string' ? { ip } : {}),
            ...(typeof userAgent === 'string' ? { userAgent } : {}),
            ...(typeof trace === 'string' ? { trace } : {}),
            ...(meta && typeof meta === 'object' && Object.keys(meta).length > 0
              ? { meta }
              : {}),
            // Docker 环境信息
            ...(process.env.HOSTNAME && { containerId: process.env.HOSTNAME }),
            ...(process.env.NODE_NAME && { nodeName: process.env.NODE_NAME }),
          };
          return JSON.stringify(logEntry);
        },
      ),
    );

    // 控制台格式（开发环境友好）
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(
        ({ timestamp, level, message, context, requestId }) => {
          const ctx = context || this.context;
          const reqId =
            typeof requestId === 'string' ? `[${requestId.slice(-8)}]` : '';
          return `${timestamp} ${level} ${ctx ? `[${ctx}]` : ''} ${reqId} ${message}`;
        },
      ),
    );

    const transports: winston.transport[] = [];

    // 控制台输出（Docker 环境重要）
    transports.push(
      new winston.transports.Console({
        level: logLevel,
        format: nodeEnv === 'production' ? logFormat : consoleFormat,
      }),
    );

    // 生产环境文件日志
    if (nodeEnv === 'production') {
      // 错误日志
      transports.push(
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          format: logFormat,
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true,
        }),
      );

      // 组合日志
      transports.push(
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          format: logFormat,
          maxSize: '20m',
          maxFiles: '7d',
          zippedArchive: true,
        }),
      );

      // 访问日志
      transports.push(
        new DailyRotateFile({
          filename: 'logs/access-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'http',
          format: logFormat,
          maxSize: '50m',
          maxFiles: '7d',
          zippedArchive: true,
        }),
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      transports,
      // 未捕获异常处理
      exceptionHandlers: [
        new winston.transports.Console({
          format: nodeEnv === 'production' ? logFormat : consoleFormat,
        }),
        ...(nodeEnv === 'production'
          ? [
              new DailyRotateFile({
                filename: 'logs/exceptions-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                format: logFormat,
                maxSize: '20m',
                maxFiles: '30d',
              }),
            ]
          : []),
      ],
      // 未处理的 Promise 拒绝
      rejectionHandlers: [
        new winston.transports.Console({
          format: nodeEnv === 'production' ? logFormat : consoleFormat,
        }),
        ...(nodeEnv === 'production'
          ? [
              new DailyRotateFile({
                filename: 'logs/rejections-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                format: logFormat,
                maxSize: '20m',
                maxFiles: '30d',
              }),
            ]
          : []),
      ],
    });
  }

  /**
   * 记录日志的通用方法
   */
  public writeLog(level: string, message: string, meta?: any) {
    this.logger.log(level, message, {
      context: this.context,
      ...meta,
    });
  }

  // NestJS LoggerService 接口实现
  log(message: string, context?: string, meta?: any) {
    this.writeLog('info', message, {
      context: context || this.context,
      ...meta,
    });
  }

  error(message: string, trace?: string, context?: string, meta?: any) {
    this.writeLog('error', message, {
      context: context || this.context,
      trace,
      ...meta,
    });
  }

  warn(message: string, context?: string, meta?: any) {
    this.writeLog('warn', message, {
      context: context || this.context,
      ...meta,
    });
  }

  debug(message: string, context?: string, meta?: any) {
    this.writeLog('debug', message, {
      context: context || this.context,
      ...meta,
    });
  }

  verbose(message: string, context?: string, meta?: any) {
    this.writeLog('verbose', message, {
      context: context || this.context,
      ...meta,
    });
  }

  // 扩展方法
  info(message: string, meta?: any) {
    this.writeLog('info', message, meta);
  }

  http(message: string, meta?: any) {
    this.writeLog('http', message, meta);
  }

  // 请求日志
  logRequest(req: Request, message: string, meta?: any) {
    this.writeLog('http', message, {
      requestId: req.headers['x-request-id'],
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
      ...meta,
    });
  }

  // 数据库操作日志
  logDatabase(operation: string, table: string, meta?: any) {
    this.writeLog('debug', `Database ${operation}`, {
      operation,
      table,
      ...meta,
    });
  }

  // 业务操作日志
  logBusiness(action: string, userId?: string, meta?: any) {
    this.writeLog('info', `Business action: ${action}`, {
      action,
      userId,
      ...meta,
    });
  }

  // 安全相关日志
  logSecurity(event: string, userId?: string, ip?: string, meta?: any) {
    this.writeLog('warn', `Security event: ${event}`, {
      event,
      userId,
      ip,
      ...meta,
    });
  }
}
