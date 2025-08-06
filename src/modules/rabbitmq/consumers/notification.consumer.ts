import { Injectable, Logger } from "@nestjs/common"
import type { OnModuleInit } from "@nestjs/common"
import type { RabbitMQService } from "../services/rabbitmq.service"
import type { Message } from "../interfaces/rabbitmq.interface"

/**
 * 通知消费者
 * 处理各种通知任务
 */
@Injectable()
export class NotificationConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotificationConsumer.name)

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async onModuleInit() {
    await this.setupQueues()
    await this.startConsumers()
  }

  /**
   * 设置队列
   */
  private async setupQueues(): Promise<void> {
    // 设置推送通知工作队列
    await this.rabbitMQService["workQueue"].setupWorkQueue("push-notifications")

    // 设置系统通知广播交换机
    await this.rabbitMQService["fanoutQueue"].setupFanoutExchange("system-notifications")

    // 绑定不同的通知队列到广播交换机
    await this.rabbitMQService.bindToFanout("system-notifications", "notifications.web")
    await this.rabbitMQService.bindToFanout("system-notifications", "notifications.mobile")
    await this.rabbitMQService.bindToFanout("system-notifications", "notifications.email")
  }

  /**
   * 启动消费者
   */
  private async startConsumers(): Promise<void> {
    // 消费推送通知 (多个工作者)
    await this.rabbitMQService.startWorkers("push-notifications", this.handlePushNotification.bind(this), 3)

    // 消费Web通知
    await this.rabbitMQService.consumeFanoutQueue("notifications.web", this.handleWebNotification.bind(this))

    // 消费移动端通知
    await this.rabbitMQService.consumeFanoutQueue("notifications.mobile", this.handleMobileNotification.bind(this))

    // 消费邮件通知
    await this.rabbitMQService.consumeFanoutQueue("notifications.email", this.handleEmailNotification.bind(this))
  }

  /**
   * 处理推送通知
   */
  private async handlePushNotification(
    message: Message<{
      userId: string
      title: string
      body: string
      data?: any
    }>,
  ): Promise<void> {
    const { userId, title, body, data } = message.data

    this.logger.log(`发送推送通知给用户: ${userId}`)

    try {
      // 实现推送通知逻辑
      // await this.pushService.send({ userId, title, body, data })

      // 模拟推送
      await new Promise((resolve) => setTimeout(resolve, 500))

      this.logger.log(`推送通知发送成功: ${message.id}`)
    } catch (error) {
      this.logger.error(`推送通知发送失败: ${message.id}, 错误: ${error.message}`)
      throw error
    }
  }

  /**
   * 处理Web通知
   */
  private async handleWebNotification(
    message: Message<{
      type: string
      title: string
      message: string
      timestamp: string
    }>,
  ): Promise<void> {
    this.logger.log(`处理Web系统通知: ${message.data.type}`)

    // 实现Web通知逻辑 (如WebSocket推送)
    // await this.websocketService.broadcast(message.data)
  }

  /**
   * 处理移动端通知
   */
  private async handleMobileNotification(
    message: Message<{
      type: string
      title: string
      message: string
      timestamp: string
    }>,
  ): Promise<void> {
    this.logger.log(`处理移动端系统通知: ${message.data.type}`)

    // 实现移动端通知逻辑
    // await this.mobileNotificationService.send(message.data)
  }

  /**
   * 处理邮件通知
   */
  private async handleEmailNotification(
    message: Message<{
      type: string
      title: string
      message: string
      timestamp: string
    }>,
  ): Promise<void> {
    this.logger.log(`处理邮件系统通知: ${message.data.type}`)

    // 实现邮件通知逻辑
    // await this.emailService.sendSystemNotification(message.data)
  }
}
