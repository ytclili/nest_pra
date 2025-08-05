import { Injectable, Logger } from "@nestjs/common"
import type { RabbitMQCoreService } from "./rabbitmq-core.service"
import type { MessageSerializerService } from "./message-serializer.service"
import type { DeadLetterQueueOptions, MessageHandler, Message } from "../interfaces/rabbitmq.interface"

/**
 * 死信队列服务
 * 处理失败的消息，提供重试和错误处理机制
 */
@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name)
  private readonly dlxPrefix = "dlx"
  private readonly dlqPrefix = "dlq"

  constructor(
    private readonly coreService: RabbitMQCoreService,
    private readonly serializerService: MessageSerializerService,
  ) {}

  /**
   * 设置死信队列
   */
  async setupDeadLetterQueue(originalQueue: string, options: DeadLetterQueueOptions = {}): Promise<void> {
    const dlxName = options.deadLetterExchange || `${this.dlxPrefix}.${originalQueue}`
    const dlqName = `${this.dlqPrefix}.${originalQueue}`
    const dlRoutingKey = options.deadLetterRoutingKey || originalQueue

    // 1. 声明死信交换机
    await this.coreService.assertExchange(dlxName, {
      type: "direct",
      durable: true,
    })

    // 2. 声明死信队列
    await this.coreService.assertQueue(dlqName, {
      durable: options.durable ?? true,
      arguments: {
        // 死信队列的消息TTL (可选)
        ...(options.messageTtl && { "x-message-ttl": options.messageTtl }),
        ...options.arguments,
      },
    })

    // 3. 绑定死信队列到死信交换机
    await this.coreService.bindQueue(dlqName, dlxName, dlRoutingKey)

    // 4. 声明原始队列 (配置死信交换机)
    await this.coreService.assertQueue(originalQueue, {
      durable: options.durable ?? true,
      arguments: {
        "x-dead-letter-exchange": dlxName,
        "x-dead-letter-routing-key": dlRoutingKey,
        // 消息TTL (可选)
        ...(options.messageTtl && { "x-message-ttl": options.messageTtl }),
        ...options.arguments,
      },
    })

    this.logger.log(`死信队列设置完成: ${originalQueue} -> ${dlqName}`)
  }

  /**
   * 消费原始队列 (带重试机制)
   */
  async consumeWithRetry<T>(queueName: string, handler: MessageHandler<T>, maxRetries = 3): Promise<void> {
    await this.coreService.consume(queueName, async (message: Message<T>) => {
      try {
        await handler(message)
      } catch (error) {
        this.logger.error(`消息处理失败: ${message.id}, 错误: ${error.message}`)

        // 检查重试次数
        const retryCount = message.retryCount || 0

        if (retryCount < maxRetries) {
          // 创建重试消息
          try {
            const retryMessage = this.serializerService.createRetryMessage(message, maxRetries)

            // 重新发送到队列 (带延迟)
            await this.coreService.sendToQueue(queueName, retryMessage.data, {
              delay: retryMessage.delay,
              headers: {
                "x-retry-count": retryMessage.retryCount,
                "x-original-message-id": message.id,
              },
            })

            this.logger.log(`消息重试 ${retryMessage.retryCount}/${maxRetries}: ${message.id}`)
          } catch (retryError) {
            this.logger.error(`创建重试消息失败: ${retryError.message}`)
            // 重试失败，消息会进入死信队列
            throw error
          }
        } else {
          this.logger.error(`消息超过最大重试次数，进入死信队列: ${message.id}`)
          // 超过重试次数，抛出错误让消息进入死信队列
          throw error
        }
      }
    })

    this.logger.log(`开始消费队列 (带重试): ${queueName}`)
  }

  /**
   * 消费死信队列
   */
  async consumeDeadLetterQueue<T>(originalQueue: string, handler: MessageHandler<T>): Promise<void> {
    const dlqName = `${this.dlqPrefix}.${originalQueue}`

    await this.coreService.consume(dlqName, async (message: Message<T>) => {
      this.logger.warn(`处理死信消息: ${message.id}`)

      try {
        await handler(message)
        this.logger.log(`死信消息处理成功: ${message.id}`)
      } catch (error) {
        this.logger.error(`死信消息处理失败: ${message.id}, 错误: ${error.message}`)
        // 死信队列的消息处理失败，可以选择记录到数据库或发送告警
        await this.handleDeadLetterFailure(message, error)
      }
    })

    this.logger.log(`开始消费死信队列: ${dlqName}`)
  }

  /**
   * 重新处理死信消息
   */
  async reprocessDeadLetter<T>(originalQueue: string, messageId: string): Promise<boolean> {
    const dlqName = `${this.dlqPrefix}.${originalQueue}`

    try {
      // 这里需要实现从死信队列中获取特定消息的逻辑
      // 由于RabbitMQ不支持按消息ID获取，这里只是示例
      this.logger.warn("重新处理死信消息需要额外的实现")

      // 可以考虑以下方案:
      // 1. 使用数据库存储死信消息
      // 2. 使用Redis缓存消息内容
      // 3. 实现消息浏览功能

      return false
    } catch (error) {
      this.logger.error(`重新处理死信消息失败: ${error.message}`)
      return false
    }
  }

  /**
   * 获取死信队列统计信息
   */
  async getDeadLetterStats(originalQueue: string): Promise<{
    deadLetterQueue: any
    originalQueue: any
  }> {
    const dlqName = `${this.dlqPrefix}.${originalQueue}`

    const [dlqInfo, originalQueueInfo] = await Promise.all([
      this.coreService.getQueueInfo(dlqName).catch(() => null),
      this.coreService.getQueueInfo(originalQueue).catch(() => null),
    ])

    return {
      deadLetterQueue: dlqInfo,
      originalQueue: originalQueueInfo,
    }
  }

  /**
   * 清空死信队列
   */
  async purgeDeadLetterQueue(originalQueue: string): Promise<void> {
    const dlqName = `${this.dlqPrefix}.${originalQueue}`

    await this.coreService.purgeQueue(dlqName)

    this.logger.log(`死信队列已清空: ${dlqName}`)
  }

  /**
   * 处理死信队列消息失败的情况
   */
  private async handleDeadLetterFailure<T>(message: Message<T>, error: Error): Promise<void> {
    // 记录到数据库或发送告警
    this.logger.error("死信消息处理失败，需要人工介入", {
      messageId: message.id,
      error: error.message,
      data: message.data,
    })

    // 可以实现以下功能:
    // 1. 发送邮件告警
    // 2. 记录到错误日志表
    // 3. 发送到监控系统
    // 4. 触发人工处理流程
  }

  /**
   * 批量设置死信队列
   */
  async setupMultipleDeadLetterQueues(
    queues: Array<{
      name: string
      options?: DeadLetterQueueOptions
    }>,
  ): Promise<void> {
    const setupPromises = queues.map(({ name, options }) => this.setupDeadLetterQueue(name, options))

    await Promise.all(setupPromises)

    this.logger.log(`批量设置 ${queues.length} 个死信队列完成`)
  }
}
