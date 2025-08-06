import { Injectable, Logger } from "@nestjs/common"
import  { RabbitMQCoreService } from "./rabbitmq-core.service"

/**
 * RabbitMQ 简易服务
 * 提供最简单的消息发送接口，基于配置文件自动路由
 */
@Injectable()
export class RabbitMQEasyService {
  private readonly logger = new Logger(RabbitMQEasyService.name)

  constructor(private readonly coreService: RabbitMQCoreService) {}

  // ==================== 工作任务 ====================

  /**
   * 发送邮件任务
   */
  async sendEmail(emailData: {
    to: string
    subject: string
    content: string
    priority?: 'high' | 'normal' | 'low'
  }): Promise<boolean> {
    return this.sendToQueue('email-tasks', emailData)
  }

  /**
   * 发送短信任务
   */
  async sendSMS(smsData: {
    phone: string
    message: string
    urgent?: boolean
  }): Promise<boolean> {
    return this.sendToQueue('sms-tasks', smsData)
  }

  /**
   * 发送图片处理任务
   */
  async processImage(imageData: {
    imageUrl: string
    operations: string[]
    userId?: string
  }): Promise<boolean> {
    return this.sendToQueue('image-processing', imageData)
  }

  // ==================== 事件发布 ====================

  /**
   * 发布用户事件
   */
  async publishUserEvent(action: string, userData: any): Promise<boolean> {
    return this.publishToExchange('events-exchange', `user.${action}`, {
      entity: 'user',
      action,
      data: userData,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 发布订单事件
   */
  async publishOrderEvent(action: string, orderData: any): Promise<boolean> {
    return this.publishToExchange('events-exchange', `order.${action}`, {
      entity: 'order',
      action,
      data: orderData,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 发布支付事件
   */
  async publishPaymentEvent(action: string, paymentData: any): Promise<boolean> {
    return this.publishToExchange('events-exchange', `payment.${action}`, {
      entity: 'payment',
      action,
      data: paymentData,
      timestamp: new Date().toISOString()
    })
  }

  // ==================== 日志发送 ====================

  /**
   * 发送错误日志
   */
  async logError(service: string, message: string, error?: any): Promise<boolean> {
    return this.publishToExchange('logs-exchange', `${service}.error`, {
      level: 'error',
      service,
      message,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 发送警告日志
   */
  async logWarning(service: string, message: string, data?: any): Promise<boolean> {
    return this.publishToExchange('logs-exchange', `${service}.warning`, {
      level: 'warning',
      service,
      message,
      data,
      timestamp: new Date().toISOString()
    })
  }

  // ==================== 通知广播 ====================

  /**
   * 广播系统通知
   */
  async broadcastNotification(notification: {
    type: 'maintenance' | 'update' | 'alert' | 'info'
    title: string
    message: string
    data?: any
  }): Promise<boolean> {
    return this.publishToExchange('notifications-exchange', '', {
      ...notification,
      timestamp: new Date().toISOString()
    })
  }

  // ==================== 优先级任务 ====================

  /**
   * 发送紧急任务
   */
  async sendUrgentTask(taskData: any): Promise<boolean> {
    return this.publishToExchange('priority-exchange', 'urgent', taskData, {
      priority: 10
    })
  }

  // ==================== 私有方法 ====================

  /**
   * 发送消息到队列（直接发送）
   */
  private async sendToQueue(queueName: string, data: any, options?: any): Promise<boolean> {
    try {
      return await this.coreService.sendToQueue(queueName, data, options)
    } catch (error) {
      this.logger.error(`发送消息到队列失败: ${queueName}`, error.message)
      throw error
    }
  }

  /**
   * 发布消息到交换机
   */
  private async publishToExchange(
    exchangeName: string, 
    routingKey: string, 
    data: any, 
    options?: any
  ): Promise<boolean> {
    try {
      return await this.coreService.publish(exchangeName, routingKey, data, options)
    } catch (error) {
      this.logger.error(`发布消息到交换机失败: ${exchangeName}`, error.message)
      throw error
    }
  }

  // ==================== 批量操作 ====================

  /**
   * 批量发送邮件
   */
  async sendBatchEmails(emails: Array<{
    to: string
    subject: string
    content: string
  }>): Promise<boolean[]> {
    const promises = emails.map(email => this.sendEmail(email))
    return Promise.all(promises)
  }

  /**
   * 批量发布事件
   */
  async publishBatchEvents(events: Array<{
    entity: string
    action: string
    data: any
  }>): Promise<boolean[]> {
    const promises = events.map(event => {
      const routingKey = `${event.entity}.${event.action}`
      return this.publishToExchange('events-exchange', routingKey, {
        entity: event.entity,
        action: event.action,
        data: event.data,
        timestamp: new Date().toISOString()
      })
    })
    return Promise.all(promises)
  }
}
