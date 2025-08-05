import { Injectable, Logger } from "@nestjs/common"
import type { RabbitMQCoreService } from "./rabbitmq-core.service"
import type { QueueOptions, MessageHandler, PublishOptions } from "../interfaces/rabbitmq.interface"

/**
 * 优先级队列服务
 * 实现消息优先级处理功能
 */
@Injectable()
export class PriorityQueueService {
  private readonly logger = new Logger(PriorityQueueService.name)
  private readonly priorityQueuePrefix = "priority.queue"

  constructor(private readonly coreService: RabbitMQCoreService) {}

  /**
   * 设置优先级队列
   */
  async setupPriorityQueue(queueName: string, maxPriority = 10, options: QueueOptions = {}): Promise<void> {
    const fullQueueName = `${this.priorityQueuePrefix}.${queueName}`

    await this.coreService.assertQueue(fullQueueName, {
      durable: options.durable ?? true,
      exclusive: options.exclusive ?? false,
      autoDelete: options.autoDelete ?? false,
      arguments: {
        "x-max-priority": maxPriority,
        ...options.arguments,
      },
    })

    this.logger.log(`优先级队列设置完成: ${fullQueueName}, 最大优先级: ${maxPriority}`)
  }

  /**
   * 发送优先级消息
   */
  async sendPriorityMessage<T>(
    queueName: string,
    data: T,
    priority: number,
    options: PublishOptions = {},
  ): Promise<boolean> {
    const fullQueueName = `${this.priorityQueuePrefix}.${queueName}`

    // 验证优先级范围
    if (priority < 0 || priority > 255) {
      throw new Error("优先级必须在 0-255 之间")
    }

    const publishOptions: PublishOptions = {
      ...options,
      priority,
    }

    const result = await this.coreService.sendToQueue(fullQueueName, data, publishOptions)

    this.logger.debug(`优先级消息发送到队列 ${fullQueueName}, 优先级: ${priority}`)

    return result
  }

  /**
   * 消费优先级队列
   */
  async consumePriorityQueue<T>(queueName: string, handler: MessageHandler<T>): Promise<void> {
    const fullQueueName = `${this.priorityQueuePrefix}.${queueName}`

    await this.coreService.consume(fullQueueName, handler)
    this.logger.log(`开始消费优先级队列: ${fullQueueName}`)
  }

  /**
   * 发送高优先级消息
   */
  async sendHighPriorityMessage<T>(queueName: string, data: T, options: PublishOptions = {}): Promise<boolean> {
    return this.sendPriorityMessage(queueName, data, 10, options)
  }

  /**
   * 发送中优先级消息
   */
  async sendMediumPriorityMessage<T>(queueName: string, data: T, options: PublishOptions = {}): Promise<boolean> {
    return this.sendPriorityMessage(queueName, data, 5, options)
  }

  /**
   * 发送低优先级消息
   */
  async sendLowPriorityMessage<T>(queueName: string, data: T, options: PublishOptions = {}): Promise<boolean> {
    return this.sendPriorityMessage(queueName, data, 1, options)
  }

  /**
   * 批量发送不同优先级的消息
   */
  async sendBatchPriorityMessages<T>(
    queueName: string,
    messages: Array<{
      data: T
      priority: number
      options?: PublishOptions
    }>,
  ): Promise<boolean[]> {
    const sendPromises = messages.map(({ data, priority, options }) =>
      this.sendPriorityMessage(queueName, data, priority, options),
    )

    const results = await Promise.all(sendPromises)

    this.logger.log(`批量发送 ${messages.length} 条优先级消息到队列 ${queueName}`)

    return results
  }

  /**
   * 设置任务优先级队列
   * 常见的任务处理场景
   */
  async setupTaskPriorityQueue(): Promise<void> {
    await this.setupPriorityQueue("tasks", 10)
    this.logger.log("任务优先级队列设置完成")
  }

  /**
   * 发送任务消息
   */
  async sendTask(taskType: "urgent" | "normal" | "low", taskData: any): Promise<boolean> {
    const priorityMap = {
      urgent: 10,
      normal: 5,
      low: 1,
    }

    const priority = priorityMap[taskType]

    return this.sendPriorityMessage(
      "tasks",
      {
        type: taskType,
        data: taskData,
        createdAt: new Date().toISOString(),
      },
      priority,
    )
  }

  /**
   * 消费任务队列
   */
  async consumeTaskQueue(
    handler: MessageHandler<{
      type: string
      data: any
      createdAt: string
    }>,
  ): Promise<void> {
    await this.consumePriorityQueue("tasks", async (message) => {
      this.logger.log(`处理 ${message.data.type} 任务: ${message.id}`)
      await handler(message)
    })
  }

  /**
   * 设置通知优先级队列
   */
  async setupNotificationPriorityQueue(): Promise<void> {
    await this.setupPriorityQueue("notifications", 5)
    this.logger.log("通知优先级队列设置完成")
  }

  /**
   * 发送通知消息
   */
  async sendNotification(
    type: "critical" | "important" | "info",
    notification: {
      userId: string
      title: string
      content: string
      channel: "email" | "sms" | "push"
    },
  ): Promise<boolean> {
    const priorityMap = {
      critical: 5,
      important: 3,
      info: 1,
    }

    const priority = priorityMap[type]

    return this.sendPriorityMessage(
      "notifications",
      {
        ...notification,
        type,
        createdAt: new Date().toISOString(),
      },
      priority,
    )
  }

  /**
   * 获取优先级队列统计信息
   */
  async getPriorityQueueStats(queueName: string): Promise<any> {
    const fullQueueName = `${this.priorityQueuePrefix}.${queueName}`

    return this.coreService.getQueueInfo(fullQueueName)
  }
}
