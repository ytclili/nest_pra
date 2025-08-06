import { Injectable, Logger } from "@nestjs/common"
import type { OnModuleInit } from "@nestjs/common"
import type { RabbitMQService } from "../services/rabbitmq.service"
import type { Message } from "../interfaces/rabbitmq.interface"

/**
 * 邮件消费者
 * 处理邮件发送任务
 */
@Injectable()
export class EmailConsumer implements OnModuleInit {
  private readonly logger = new Logger(EmailConsumer.name)

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async onModuleInit() {
    // 设置优先级队列
    await this.rabbitMQService["priorityQueue"].setupPriorityQueue("email-tasks", 10)

    // 开始消费邮件任务
    await this.rabbitMQService.consumePriorityQueue("email-tasks", this.handleEmailTask.bind(this))
  }

  /**
   * 处理邮件任务
   */
  private async handleEmailTask(
    message: Message<{
      to: string
      subject: string
      content: string
      priority?: string
    }>,
  ): Promise<void> {
    const { to, subject, content, priority } = message.data

    this.logger.log(`发送邮件: ${to} - ${subject} (优先级: ${priority || "normal"})`)

    try {
      // 这里实现实际的邮件发送逻辑
      // await this.emailService.send({ to, subject, content })

      // 模拟邮件发送
      await new Promise((resolve) => setTimeout(resolve, 1000))

      this.logger.log(`邮件发送成功: ${message.id}`)
    } catch (error) {
      this.logger.error(`邮件发送失败: ${message.id}, 错误: ${error.message}`)
      throw error
    }
  }
}
