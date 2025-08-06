import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { RabbitMQEasyService } from "../services/rabbitmq-easy.service"

/**
 * 业务消费者
 * 演示如何使用 RabbitMQEasyService 进行消息消费
 */
@Injectable()
export class BusinessConsumer implements OnModuleInit {
  private readonly logger = new Logger(BusinessConsumer.name)
  private isRunning = false

  constructor(private readonly rabbitMQEasyService: RabbitMQEasyService) {}

  async onModuleInit() {
    // 应用启动时自动开始消费（可选）
    // this.startAllConsumers()
  }

  /**
   * 启动所有消费者
   */
  async startAllConsumers(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('消费者已经在运行中')
      return
    }

    this.isRunning = true
    this.logger.log('🚀 启动所有业务消费者...')

    // 并行启动所有消费者
    await Promise.all([
      this.startEmailConsumer(),
      this.startSMSConsumer(),
      this.startImageProcessingConsumer(),
      this.startUserEventConsumer(),
      this.startOrderEventConsumer(),
      this.startErrorLogConsumer(),
      this.startNotificationConsumer(),
      this.startUrgentTaskConsumer(),
    ])

    this.logger.log('✅ 所有业务消费者启动完成')
  }

  /**
   * 启动邮件任务消费者
   */
  async startEmailConsumer(): Promise<void> {
    this.logger.log('📧 启动邮件任务消费者...')
    
    await this.rabbitMQEasyService.consumeEmailTasks(async (emailData) => {
      this.logger.log(`📧 处理邮件任务: ${emailData.to}`)
      
      // 模拟邮件发送处理
      await this.simulateEmailSending(emailData)
      
      this.logger.log(`✅ 邮件发送完成: ${emailData.to}`)
    })
  }

  /**
   * 启动短信任务消费者
   */
  async startSMSConsumer(): Promise<void> {
    this.logger.log('📱 启动短信任务消费者...')
    
    await this.rabbitMQEasyService.consumeSMSTasks(async (smsData) => {
      this.logger.log(`📱 处理短信任务: ${smsData.phone}`)
      
      // 模拟短信发送处理
      await this.simulateSMSSending(smsData)
      
      this.logger.log(`✅ 短信发送完成: ${smsData.phone}`)
    })
  }

  /**
   * 启动图片处理消费者
   */
  async startImageProcessingConsumer(): Promise<void> {
    this.logger.log('🖼️ 启动图片处理消费者...')
    
    await this.rabbitMQEasyService.consumeImageProcessing(async (imageData) => {
      this.logger.log(`🖼️ 处理图片: ${imageData.imageUrl}`)
      
      // 模拟图片处理
      await this.simulateImageProcessing(imageData)
      
      this.logger.log(`✅ 图片处理完成: ${imageData.imageUrl}`)
    })
  }

  /**
   * 启动用户事件消费者
   */
  async startUserEventConsumer(): Promise<void> {
    this.logger.log('👤 启动用户事件消费者...')
    
    await this.rabbitMQEasyService.consumeUserEvents(async (eventData) => {
      this.logger.log(`👤 处理用户事件: ${eventData.action}`)
      
      // 处理用户事件
      await this.handleUserEvent(eventData)
      
      this.logger.log(`✅ 用户事件处理完成: ${eventData.action}`)
    })
  }

  /**
   * 启动订单事件消费者
   */
  async startOrderEventConsumer(): Promise<void> {
    this.logger.log('🛒 启动订单事件消费者...')
    
    await this.rabbitMQEasyService.consumeOrderEvents(async (eventData) => {
      this.logger.log(`🛒 处理订单事件: ${eventData.action}`)
      
      // 处理订单事件
      await this.handleOrderEvent(eventData)
      
      this.logger.log(`✅ 订单事件处理完成: ${eventData.action}`)
    })
  }

  /**
   * 启动错误日志消费者
   */
  async startErrorLogConsumer(): Promise<void> {
    this.logger.log('🚨 启动错误日志消费者...')
    
    await this.rabbitMQEasyService.consumeErrorLogs(async (logData) => {
      this.logger.error(`🚨 收到错误日志: ${logData.service} - ${logData.message}`)
      
      // 处理错误日志（如发送告警、记录到数据库等）
      await this.handleErrorLog(logData)
      
      this.logger.log(`✅ 错误日志处理完成`)
    })
  }

  /**
   * 启动通知消费者
   */
  async startNotificationConsumer(): Promise<void> {
    this.logger.log('🔔 启动通知消费者...')
    
    await this.rabbitMQEasyService.consumeWebNotifications(async (notification) => {
      this.logger.log(`🔔 处理通知: ${notification.type} - ${notification.title}`)
      
      // 处理通知
      await this.handleNotification(notification)
      
      this.logger.log(`✅ 通知处理完成: ${notification.title}`)
    })
  }

  /**
   * 启动紧急任务消费者
   */
  async startUrgentTaskConsumer(): Promise<void> {
    this.logger.log('🚨 启动紧急任务消费者...')
    
    await this.rabbitMQEasyService.consumeUrgentTasks(async (taskData) => {
      this.logger.log(`🚨 处理紧急任务:`, taskData)
      
      // 处理紧急任务
      await this.handleUrgentTask(taskData)
      
      this.logger.log(`✅ 紧急任务处理完成`)
    })
  }

  /**
   * 启动多工作者消费者示例
   */
  async startMultiWorkerExample(): Promise<void> {
    this.logger.log('👥 启动多工作者消费者示例...')
    
    // 启动3个工作者同时消费邮件队列
    await this.rabbitMQEasyService.startMultipleWorkers(
      'email-tasks',
      async (emailData: any) => {
        await this.simulateEmailSending(emailData)
      },
      3, // 3个工作者
      { prefetch: 1 } // 每个工作者一次只处理一个消息
    )
  }

  // ==================== 业务处理方法 ====================

  /**
   * 模拟邮件发送
   */
  private async simulateEmailSending(emailData: any): Promise<void> {
    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    
    // 这里可以集成真实的邮件服务
    // 如 SendGrid, AWS SES, 阿里云邮件推送等
    
    // 模拟偶尔失败的情况
    if (Math.random() < 0.1) { // 10% 失败率
      throw new Error(`邮件发送失败: ${emailData.to}`)
    }
  }

  /**
   * 模拟短信发送
   */
  private async simulateSMSSending(smsData: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
    
    // 这里可以集成真实的短信服务
    // 如阿里云短信、腾讯云短信等
    
    if (Math.random() < 0.05) { // 5% 失败率
      throw new Error(`短信发送失败: ${smsData.phone}`)
    }
  }

  /**
   * 模拟图片处理
   */
  private async simulateImageProcessing(imageData: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))
    
    // 这里可以集成图片处理服务
    // 如七牛云、阿里云OSS、AWS S3等
    
    if (Math.random() < 0.08) { // 8% 失败率
      throw new Error(`图片处理失败: ${imageData.imageUrl}`)
    }
  }

  /**
   * 处理用户事件
   */
  private async handleUserEvent(eventData: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    switch (eventData.action) {
      case 'created':
        this.logger.log(`新用户注册: ${eventData.data.email}`)
        // 发送欢迎邮件、创建用户目录等
        break
      case 'updated':
        this.logger.log(`用户信息更新: ${eventData.data.id}`)
        // 同步用户信息到其他系统
        break
      case 'deleted':
        this.logger.log(`用户删除: ${eventData.data.id}`)
        // 清理用户相关数据
        break
      default:
        this.logger.log(`未知用户事件: ${eventData.action}`)
    }
  }

  /**
   * 处理订单事件
   */
  private async handleOrderEvent(eventData: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    switch (eventData.action) {
      case 'created':
        this.logger.log(`新订单创建: ${eventData.data.orderNo}`)
        // 库存扣减、发送确认邮件等
        break
      case 'paid':
        this.logger.log(`订单支付完成: ${eventData.data.orderNo}`)
        // 发货通知、积分奖励等
        break
      case 'cancelled':
        this.logger.log(`订单取消: ${eventData.data.orderNo}`)
        // 库存回滚、退款处理等
        break
      default:
        this.logger.log(`未知订单事件: ${eventData.action}`)
    }
  }

  /**
   * 处理错误日志
   */
  private async handleErrorLog(logData: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // 这里可以：
    // 1. 发送告警到钉钉、企业微信等
    // 2. 记录到监控系统
    // 3. 发送邮件给开发人员
    // 4. 写入错误日志数据库
    
    this.logger.error(`[${logData.service}] ${logData.message}`)
    if (logData.stack) {
      this.logger.error(`Stack: ${logData.stack}`)
    }
  }

  /**
   * 处理通知
   */
  private async handleNotification(notification: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 这里可以：
    // 1. 推送到前端页面
    // 2. 发送推送通知
    // 3. 记录到通知历史
    
    this.logger.log(`通知类型: ${notification.type}`)
    this.logger.log(`通知标题: ${notification.title}`)
    this.logger.log(`通知内容: ${notification.message}`)
  }

  /**
   * 处理紧急任务
   */
  private async handleUrgentTask(taskData: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 紧急任务需要快速处理
    this.logger.warn(`🚨 紧急任务处理:`, JSON.stringify(taskData, null, 2))
    
    // 这里处理紧急任务逻辑
    // 如系统维护、紧急修复等
  }

  /**
   * 停止所有消费者
   */
  stopAllConsumers(): void {
    this.isRunning = false
    this.logger.log('🛑 停止所有业务消费者')
    // 注意：实际的停止逻辑需要在 RabbitMQEasyService 中实现
  }

  /**
   * 获取消费者状态
   */
  getStatus(): { isRunning: boolean } {
    return { isRunning: this.isRunning }
  }
}
