import { Injectable, Logger } from "@nestjs/common"
import  * as amqp from "amqplib"
import  { RabbitMQConnectionService } from "./rabbitmq-connection.service"
import  { MessageSerializerService } from "./message-serializer.service"
import  {
  QueueOptions,
  ExchangeOptions,
  ConsumerOptions,
  PublishOptions,
  MessageHandler,
  Message,
} from "../interfaces/rabbitmq.interface"

/**
 * RabbitMQ 核心服务
 * 提供基础的队列操作功能
 */
@Injectable()
export class RabbitMQCoreService {
  private readonly logger = new Logger(RabbitMQCoreService.name)

  constructor(
    private readonly connectionService: RabbitMQConnectionService,
    private readonly serializerService: MessageSerializerService,
  ) {}

  /**
   * 声明交换机
   */
  async assertExchange(exchange: string, options: ExchangeOptions): Promise<void> {
    const channel = this.connectionService.getChannel()

    await channel.assertExchange(exchange, options.type, {
      durable: options.durable ?? true,
      autoDelete: options.autoDelete ?? false,
      arguments: options.arguments,
    })

    this.logger.debug(`交换机 ${exchange} (${options.type}) 声明成功`)
  }

  /**
   * 声明队列
   */
  async assertQueue(queue: string, options: QueueOptions = {}): Promise<amqp.Replies.AssertQueue> {
    const channel = this.connectionService.getChannel()

    const result = await channel.assertQueue(queue, {
      durable: options.durable ?? true,
      exclusive: options.exclusive ?? false,
      autoDelete: options.autoDelete ?? false,
      arguments: options.arguments,
    })

    this.logger.debug(`队列 ${queue} 声明成功`)
    return result
  }

  /**
   * 绑定队列到交换机
   */
  async bindQueue(queue: string, exchange: string, routingKey = ""): Promise<void> {
    const channel = this.connectionService.getChannel()

    await channel.bindQueue(queue, exchange, routingKey)

    this.logger.debug(`队列 ${queue} 绑定到交换机 ${exchange}，路由键: ${routingKey}`)
  }

  /**
   * 发布消息到交换机
   */
  async publish<T>(exchange: string, routingKey: string, data: T, options: PublishOptions = {}): Promise<boolean> {
    const channel = this.connectionService.getChannel()

    // 序列化消息
    const messageBuffer = this.serializerService.serialize(data, {
      delay: options.delay,
      priority: options.priority,
      headers: options.headers,
    })

    // 发布选项
    const publishOptions: amqp.Options.Publish = {
      persistent: options.persistent ?? true,
      priority: options.priority,
      expiration: options.expiration,
      headers: options.headers,
      timestamp: Date.now(),
    }

    // 处理延迟消息
    if (options.delay && options.delay > 0) {
      publishOptions.headers = {
        ...publishOptions.headers,
        "x-delay": options.delay,
      }
    }

    const result = channel.publish(exchange, routingKey, messageBuffer, publishOptions)

    this.logger.debug(`消息发布到交换机 ${exchange}，路由键: ${routingKey}`)

    return result
  }

  /**
   * 发送消息到队列
   */
  async sendToQueue<T>(queue: string, data: T, options: PublishOptions = {}): Promise<boolean> {
    const channel = this.connectionService.getChannel()

    // 序列化消息
    const messageBuffer = this.serializerService.serialize(data, {
      delay: options.delay,
      priority: options.priority,
      headers: options.headers,
    })

    // 发送选项
    const sendOptions: amqp.Options.Publish = {
      persistent: options.persistent ?? true,
      priority: options.priority,
      expiration: options.expiration,
      headers: options.headers,
      timestamp: Date.now(),
    }

    const result = channel.sendToQueue(queue, messageBuffer, sendOptions)

    this.logger.debug(`消息发送到队列 ${queue}`)

    return result
  }

  /**
   * 消费队列消息
   */
  async consume<T>(
    queue: string,
    handler: MessageHandler<T>,
    options: ConsumerOptions = {},
  ): Promise<amqp.Replies.Consume> {
    const channel = this.connectionService.getChannel()

    const result = await channel.consume(
      queue,
      async (msg) => {
        if (!msg) return

        try {
          // 反序列化消息
          const message = this.serializerService.deserialize<T>(msg.content)

          this.logger.debug(`处理消息: ${message.id}`)

          // 调用处理器
          await handler(message)

          // 确认消息
          if (!options.noAck) {
            channel.ack(msg)
          }

          this.logger.debug(`消息处理成功: ${message.id}`)
        } catch (error) {
          this.logger.error(`消息处理失败: ${error.message}`)

          // 拒绝消息并重新入队
          if (!options.noAck) {
            channel.nack(msg, false, true)
          }
        }
      },
      {
        noAck: options.noAck ?? false,
        exclusive: options.exclusive ?? false,
        priority: options.priority,
        arguments: options.arguments,
      },
    )

    this.logger.log(`开始消费队列 ${queue}`)

    return result
  }


   /**
   * 手动ACK消费队列消息
   */
   async consumeWithManualAck<T>(
    queue: string,
    handler: (message: Message<T>, ackCallback: {
      ack: () => void
      nack: (requeue?: boolean) => void
      reject: (requeue?: boolean) => void
    }) => Promise<void>,
    options: {
      prefetch?: number
      exclusive?: boolean
    } = {}
  ): Promise<amqp.Replies.Consume> {
    const channel = this.connectionService.getChannel()

    // 设置预取数量
    if (options.prefetch) {
      await channel.prefetch(options.prefetch)
    }

    const result = await channel.consume(
      queue,
      async (msg) => {
        if (!msg) return

        try {
          // 反序列化消息
          const message:Message<T> = this.serializerService.deserialize<T>(msg.content)

          this.logger.debug(`收到消息: ${message.id}`)

          // 创建ACK回调函数
          const ackCallback = {
            ack: () => {
              channel.ack(msg)
              this.logger.debug(`消息ACK: ${message.id}`)
            },
            nack: (requeue = true) => {
              channel.nack(msg, false, requeue)
              this.logger.debug(`消息NACK: ${message.id}, requeue: ${requeue}`)
            },
            reject: (requeue = true) => {
              channel.reject(msg, requeue)
              this.logger.debug(`消息REJECT: ${message.id}, requeue: ${requeue}`)
            }
          }

          // 调用处理器
          await handler(message, ackCallback)

        } catch (error) {
          this.logger.error(`消息处理异常: ${error.message}`)
          // 如果处理器抛出异常，默认NACK并重新入队
          channel.nack(msg, false, true)
        }
      },
      {
        noAck: false, // 手动ACK
        exclusive: options.exclusive ?? false,
      },
    )

    this.logger.log(`开始手动ACK消费队列 ${queue}`)

    return result
  }


  /**
   * 获取队列信息
   */
  async getQueueInfo(queue: string): Promise<amqp.Replies.AssertQueue> {
    const channel = this.connectionService.getChannel()
    return channel.checkQueue(queue)
  }

  /**
   * 清空队列
   */
  async purgeQueue(queue: string): Promise<amqp.Replies.PurgeQueue> {
    const channel = this.connectionService.getChannel()
    const result = await channel.purgeQueue(queue)

    this.logger.log(`队列 ${queue} 已清空`)

    return result
  }

  /**
   * 删除队列
   */
  async deleteQueue(
    queue: string,
    options?: {
      ifUnused?: boolean
      ifEmpty?: boolean
    },
  ): Promise<amqp.Replies.DeleteQueue> {
    const channel = this.connectionService.getChannel()
    const result = await channel.deleteQueue(queue, options)

    this.logger.log(`队列 ${queue} 已删除`)

    return result
  }

  /**
   * 删除交换机
   */
  async deleteExchange(
    exchange: string,
    options?: {
      ifUnused?: boolean
    },
  ): Promise<amqp.Replies.DeleteExchange> {
    const channel = this.connectionService.getChannel()
    const result = await channel.deleteExchange(exchange, options)

    this.logger.log(`交换机 ${exchange} 已删除`)

    return result
  }
}
