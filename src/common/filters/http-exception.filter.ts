import { type ExceptionFilter, Catch, type ArgumentsHost, HttpException, Logger } from "@nestjs/common"
import type { Request, Response } from "express"

/**
 * 全局HTTP异常过滤器
 * 统一处理应用中的所有HTTP异常，提供一致的错误响应格式
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const status = exception.getStatus()

    // 获取异常响应内容
    const exceptionResponse = exception.getResponse()
    const message =
      typeof exceptionResponse === "string"
        ? exceptionResponse
        : (exceptionResponse as any).message || exception.message

    // 构建错误响应对象
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: Array.isArray(message) ? message : [message],
      ...(process.env.NODE_ENV === "development" && {
        stack: exception.stack, // 开发环境显示堆栈信息
      }),
    }

    // 记录错误日志
    this.logger.error(`HTTP ${status} Error: ${request.method} ${request.url}`, JSON.stringify(errorResponse))

    // 返回错误响应
    response.status(status).json(errorResponse)
  }
}
