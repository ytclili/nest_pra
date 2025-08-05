import {  ExceptionFilter, Catch,  ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common"
import  { Request, Response } from "express"
import  { CustomLoggerService } from "../logger/logger.service"

/**
 * 全局HTTP异常过滤器
 * 统一处理异常并记录详细日志
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: CustomLoggerService) {
    this.logger.setContext("ExceptionFilter")
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status: number
    let message: string | object
    let stack: string | undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()
      message =
        typeof exceptionResponse === "string"
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message
      stack = exception.stack
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR
      message = exception.message
      stack = exception.stack
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR
      message = "Internal server error"
      stack = String(exception)
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: Array.isArray(message) ? message : [message],
      requestId: request.headers["x-request-id"],
      ...(process.env.NODE_ENV === "development" && { stack }),
    }

    // 记录错误日志
    this.logger.error(`HTTP ${status} Error: ${request.method} ${request.url}`, stack, "ExceptionFilter", {
      requestId: request.headers["x-request-id"],
      userId: (request as any).user?.id,
      ip: request.ip || request.connection.remoteAddress,
      userAgent: request.get("User-Agent"),
      body: this.sanitizeBody(request.body),
      query: request.query,
      params: request.params,
      statusCode: status,
      errorMessage: message,
    })

    response.status(status).json(errorResponse)
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== "object") return body

    const sensitiveFields = ["password", "token", "secret", "key"]
    const sanitized = { ...body }

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = "***REDACTED***"
      }
    }

    return sanitized
  }
}
