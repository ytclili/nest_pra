import { Injectable, Logger } from "@nestjs/common"
import type { RabbitMQCoreService } from "./rabbitmq-core.service"
import type { QueueOptions, MessageHandler, PublishOptions } from "../interfaces/rabbitmq.interface"

/**
 * 主题队列服务
 * 实现基于主题模式的消息路由，支持通配符匹配
 */
@Injectable()
export class TopicQueueService {
  private readonly logger = new Logger(TopicQueueService.name)
  private readonly topicExchangePrefix = "topic.exchange"

  constructor(private readonly coreService: RabbitMQCoreService) {}

  /**
   * 设置主题交换机
   */
  async setupTopicExchange(exchangeName: string): Promise<void> {
    const fullExchangeName = `${this.topicExchangePrefix}.${exchangeName}`

    await this.coreService.assertExchange(fullExchangeName, {
      type: "topic",
      durable: true,
    })

    this.logger.log(`主题交换机设置完成: ${fullExchangeName}`)
  }

  /**
   * 绑定队列到主题交换机
   */
  async bindQueueToTopic(
    exchangeName: string,
    queueName: string,
    routingPattern: string,
    options: QueueOptions = {},
  ): Promise<void> {
    const fullExchangeName = `${this.topicExchangePrefix}.${exchangeName}`

    // 声明队列
    await this.coreService.assertQueue(queueName, {
      durable: options.durable ?? true,
      exclusive: options.exclusive ?? false,
      autoDelete: options.autoDelete ?? false,
      arguments: options.arguments,
    })

    // 绑定队列到主题交换机，使用路由模式
    await this.coreService.bindQueue(queueName, fullExchangeName, routingPattern)

    this.logger.log(`队列 ${queueName} 绑定到主题交换机 ${fullExchangeName}，路由模式: ${routingPattern}`)
  }

  /**
   * 发布主题消息
   */
  async publishTopic<T>(
    exchangeName: string,
    routingKey: string,
    data: T,
    options: PublishOptions = {},
  ): Promise<boolean> {
    const fullExchangeName = `${this.topicExchangePrefix}.${exchangeName}`

    const result = await this.coreService.publish(fullExchangeName, routingKey, data, options)

    this.logger.debug(`主题消息发布到交换机 ${fullExchangeName}，路由键: ${routingKey}`)

    return result
  }

  /**
   * 消费主题队列
   */
  async consumeTopicQueue<T>(queueName: string, handler: MessageHandler<T>): Promise<void> {
    await this.coreService.consume(queueName, handler)
    this.logger.log(`开始消费主题队列: ${queueName}`)
  }

  /**
   * 批量绑定路由模式
   * 一个队列可以绑定多个路由模式
   */
  async bindMultiplePatterns(
    exchangeName: string,
    queueName: string,
    routingPatterns: string[],
    options: QueueOptions = {},
  ): Promise<void> {
    const fullExchangeName = `${this.topicExchangePrefix}.${exchangeName}`

    // 确保交换机存在
    await this.setupTopicExchange(exchangeName)

    // 声明队列
    await this.coreService.assertQueue(queueName, {
      durable: options.durable ?? true,
      exclusive: options.exclusive ?? false,
      autoDelete: options.autoDelete ?? false,
      arguments: options.arguments,
    })

    // 批量绑定路由模式
    const bindPromises = routingPatterns.map((pattern) =>
      this.coreService.bindQueue(queueName, fullExchangeName, pattern),
    )

    await Promise.all(bindPromises)

    this.logger.log(`队列 ${queueName} 绑定多个路由模式: ${routingPatterns.join(", ")}`)
  }

  /**
   * 创建日志主题队列
   * 常见的日志路由模式示例
   */
  async setupLogTopicQueues(exchangeName: string): Promise<void> {
    await this.setupTopicExchange(exchangeName)

    // 错误日志队列 - 接收所有错误级别的日志
    await this.bindQueueToTopic(exchangeName, "logs.error", "*.error.*")

    // 警告日志队列 - 接收警告和错误日志
    await this.bindMultiplePatterns(exchangeName, "logs.warning", ["*.warning.*", "*.error.*"])

    // 应用日志队列 - 接收特定应用的所有日志
    await this.bindQueueToTopic(exchangeName, "logs.app.user-service", "app.user-service.*")

    // 所有日志队列 - 接收所有日志
    await this.bindQueueToTopic(
      exchangeName,
      "logs.all",
      "#", // # 匹配所有
    )

    this.logger.log(`日志主题队列设置完成`)
  }

  /**
   * 发布日志消息
   */
  async publishLog(
    exchangeName: string,
    level: "info" | "warning" | "error",
    service: string,
    message: any,
  ): Promise<boolean> {
    const routingKey = `app.${service}.${level}`

    return this.publishTopic(exchangeName, routingKey, {
      level,
      service,
      message,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * 创建事件主题队列
   * 常见的事件路由模式示例
   */
  async setupEventTopicQueues(exchangeName: string): Promise<void> {
    await this.setupTopicExchange(exchangeName)

    // 用户事件队列
    await this.bindQueueToTopic(exchangeName, "events.user", "user.*")

    // 订单事件队列
    await this.bindQueueToTopic(exchangeName, "events.order", "order.*")

    // 支付事件队列
    await this.bindQueueToTopic(exchangeName, "events.payment", "payment.*")

    // 重要事件队列 - 接收创建和删除事件
    await this.bindMultiplePatterns(exchangeName, "events.important", ["*.created", "*.deleted"])

    this.logger.log(`事件主题队列设置完成`)
  }

  /**
   * 发布事件消息
   */
  async publishEvent(exchangeName: string, entity: string, action: string, data: any): Promise<boolean> {
    const routingKey = `${entity}.${action}`

    return this.publishTopic(exchangeName, routingKey, {
      entity,
      action,
      data,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * 解绑路由模式
   */
  async unbindPattern(exchangeName: string, queueName: string, routingPattern: string): Promise<void> {
    const fullExchangeName = `${this.topicExchangePrefix}.${exchangeName}`
    const channel = this.coreService["connectionService"].getChannel()

    await channel.unbindQueue(queueName, fullExchangeName, routingPattern)

    this.logger.log(`队列 ${queueName} 解绑路由模式 ${routingPattern}`)
  }
}
