import { Injectable, type NestMiddleware } from "@nestjs/common"
import type { Request, Response, NextFunction } from "express"
import type { CustomLoggerService } from "../logger/logger.service"
import { v4 as uuidv4 } from "uuid"

/**
 * 请求日志中间件
 * 记录所有 HTTP 请求的详细信息
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: CustomLoggerService) {
    this.logger.setContext("HTTP")
  }

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now()
    const requestId = uuidv4()

    // 将请求ID添加到请求头，方便追踪
    req.headers["x-request-id"] = requestId
    res.setHeader("X-Request-ID", requestId)

    // 记录请求开始
    this.logger.logRequest(req, "Request started", {
      body: this.sanitizeBody(req.body),
      query: req.query,
      params: req.params,
    })

    // 监听响应结束
    res.on("finish", () => {
      const duration = Date.now() - startTime
      const { statusCode } = res

      const logLevel = statusCode >= 400 ? "error" : statusCode >= 300 ? "warn" : "http"

      this.logger.writeLog(logLevel, "Request completed", {
        requestId,
        method: req.method,
        url: req.url,
        statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
        userId: (req as any).user?.id,
        contentLength: res.get("Content-Length"),
      })
    })

    // 监听响应错误
    res.on("error", (error) => {
      this.logger.error("Response error", error.stack, "HTTP", {
        requestId,
        method: req.method,
        url: req.url,
        error: error.message,
      })
    })

    next()
  }

  /**
   * 清理敏感信息
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== "object") return body

    const sensitiveFields = ["password", "token", "secret", "key", "authorization"]
    const sanitized = { ...body }

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = "***REDACTED***"
      }
    }

    return sanitized
  }
}
