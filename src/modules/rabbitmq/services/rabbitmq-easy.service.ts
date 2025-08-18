import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQCoreService } from './rabbitmq-core.service';
import { Message } from '../interfaces/rabbitmq.interface';

/**
 * RabbitMQ 简易服务
 * 提供最简单的消息发送接口，基于配置文件自动路由
 */
@Injectable()
export class RabbitMQEasyService {
  private readonly logger = new Logger(RabbitMQEasyService.name);

  constructor(private readonly coreService: RabbitMQCoreService) {}

  // ==================== 工作任务 ====================

  /**
   * 发送邮件任务
   */
  async sendEmail(emailData: {
    to: string;
    subject: string;
    content: string;
    priority?: 'high' | 'normal' | 'low';
  }): Promise<boolean> {
    return this.sendToQueue('email-tasks', emailData);
  }

  /**
   * 发送短信任务
   */
  async sendSMS(smsData: {
    phone: string;
    message: string;
    urgent?: boolean;
  }): Promise<boolean> {
    return this.sendToQueue('sms-tasks', smsData);
  }

  /**
   * 发送图片处理任务
   */
  async processImage(imageData: {
    imageUrl: string;
    operations: string[];
    userId?: string;
  }): Promise<boolean> {
    return this.sendToQueue('image-processing', imageData);
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
      timestamp: new Date().toISOString(),
    });
  }

  async publishOrderTestEvent(userData: any): Promise<boolean> {
    return this.publishToExchange('order-exchange', `order-test`, {
      entity: 'order',
      data: userData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 发布订单事件
   */
  async publishOrderEvent(action: string, orderData: any): Promise<boolean> {
    return this.publishToExchange('events-exchange', `order.${action}`, {
      entity: 'order-tasks',
      action,
      data: orderData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 发布支付事件
   */
  async publishPaymentEvent(
    action: string,
    paymentData: any,
  ): Promise<boolean> {
    return this.publishToExchange('events-exchange', `payment.${action}`, {
      entity: 'payment',
      action,
      data: paymentData,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== 日志发送 ====================

  /**
   * 发送错误日志
   */
  async logError(
    service: string,
    message: string,
    error?: any,
  ): Promise<boolean> {
    return this.publishToExchange('logs-exchange', `${service}.error`, {
      level: 'error',
      service,
      message,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 发送警告日志
   */
  async logWarning(
    service: string,
    message: string,
    data?: any,
  ): Promise<boolean> {
    return this.publishToExchange('logs-exchange', `${service}.warning`, {
      level: 'warning',
      service,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== 通知广播 ====================

  /**
   * 广播系统通知
   */
  async broadcastNotification(notification: {
    type: 'maintenance' | 'update' | 'alert' | 'info';
    title: string;
    message: string;
    data?: any;
  }): Promise<boolean> {
    return this.publishToExchange('notifications-exchange', '', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== 优先级任务 ====================

  /**
   * 发送紧急任务
   */
  async sendUrgentTask(taskData: any): Promise<boolean> {
    return this.publishToExchange('priority-exchange', 'urgent', taskData, {
      priority: 10,
    });
  }

  // ==================== 私有方法 ====================

  /**
   * 发送消息到队列（直接发送）
   */
  private async sendToQueue(
    queueName: string,
    data: any,
    options?: any,
  ): Promise<boolean> {
    try {
      return await this.coreService.sendToQueue(queueName, data, options);
    } catch (error) {
      this.logger.error(`发送消息到队列失败: ${queueName}`, error.message);
      throw error;
    }
  }

  /**
   * 发布消息到交换机
   */
  private async publishToExchange(
    exchangeName: string,
    routingKey: string,
    data: any,
    options?: any,
  ): Promise<boolean> {
    try {
      return await this.coreService.publish(
        exchangeName,
        routingKey,
        data,
        options,
      );
    } catch (error) {
      this.logger.error(`发布消息到交换机失败: ${exchangeName}`, error.message);
      throw error;
    }
  }

  // ==================== 批量操作 ====================

  /**
   * 批量发送邮件
   */
  async sendBatchEmails(
    emails: Array<{
      to: string;
      subject: string;
      content: string;
    }>,
  ): Promise<boolean[]> {
    const promises = emails.map((email) => this.sendEmail(email));
    return Promise.all(promises);
  }

  /**
   * 批量发布事件
   */
  async publishBatchEvents(
    events: Array<{
      entity: string;
      action: string;
      data: any;
    }>,
  ): Promise<boolean[]> {
    const promises = events.map((event) => {
      const routingKey = `${event.entity}.${event.action}`;
      return this.publishToExchange('events-exchange', routingKey, {
        entity: event.entity,
        action: event.action,
        data: event.data,
        timestamp: new Date().toISOString(),
      });
    });
    return Promise.all(promises);
  }

  // ==================== 消费者方法 ====================

  /**
   * 消费邮件任务队列
   */
  async consumeEmailTasks(
    handler: (emailData: {
      to: string;
      subject: string;
      content: string;
      priority?: string;
    }) => Promise<void>,
  ): Promise<void> {
    await this.consumeQueue('email-tasks', handler);
  }

  /**
   * 消费短信任务队列
   */
  async consumeSMSTasks(
    handler: (smsData: {
      phone: string;
      message: string;
      urgent?: boolean;
    }) => Promise<void>,
  ): Promise<void> {
    await this.consumeQueue('sms-tasks', handler);
  }

  /**
   * 消费图片处理队列
   */
  async consumeImageProcessing(
    handler: (imageData: {
      imageUrl: string;
      operations: string[];
      userId?: string;
    }) => Promise<void>,
  ): Promise<void> {
    await this.consumeQueue('image-processing', handler);
  }

  /**
   * 消费用户事件队列
   */
  async consumeUserEvents(
    handler: (eventData: {
      entity: string;
      action: string;
      data: any;
      timestamp: string;
    }) => Promise<void>,
  ): Promise<void> {
    await this.consumeQueue('events.user', handler);
  }

  /**
   * 消费订单事件队列
   */
  async consumeOrderEvents(
    handler: (eventData: {
      entity: string;
      action: string;
      data: any;
      timestamp: string;
    }) => Promise<void>,
  ): Promise<void> {
    await this.consumeQueue('events.order', handler);
  }

  /**
   * 消费错误日志队列
   */
  async consumeErrorLogs(
    handler: (logData: {
      level: string;
      service: string;
      message: string;
      error?: any;
      timestamp: string;
    }) => Promise<void>,
  ): Promise<void> {
    await this.consumeQueue('logs.error', handler);
  }

  /**
   * 消费Web通知队列
   */
  async consumeWebNotifications(
    handler: (notification: any) => Promise<void>,
  ): Promise<void> {
    await this.consumeQueue('notifications.web', handler);
  }

  /**
   * 消费紧急任务队列
   */
  async consumeUrgentTasks(
    handler: (taskData: any) => Promise<void>,
  ): Promise<void> {
    await this.consumeQueue('urgent-tasks', handler);
  }

  /**
   * 通用队列消费方法（手动ACK）
   */
  async consumeQueue<T>(
    queueName: string,
    handler: (data: T) => Promise<void>,
    options?: {
      prefetch?: number;
      workerId?: string;
    },
  ): Promise<void> {
    const workerId =
      options?.workerId || `worker-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`🔄 工作者 ${workerId} 开始消费队列: ${queueName}`);

    // 设置预取数量
    if (options?.prefetch) {
      const channel = this.coreService['connectionService'].getChannel();
      await channel.prefetch(options.prefetch);
    }

    await this.coreService.consume(
      queueName,
      async (message: Message) => {
        const startTime = Date.now();

        this.logger.log(`📨 工作者 ${workerId} 收到消息: ${message.id}`);
        this.logger.debug(`📄 消息内容:`, message.data);

        try {
          // 调用业务处理函数
          await handler(message.data);

          const duration = Date.now() - startTime;
          this.logger.log(
            `✅ 工作者 ${workerId} 处理完成: ${message.id}, 耗时: ${duration}ms`,
          );
        } catch (error) {
          const duration = Date.now() - startTime;
          this.logger.error(
            `❌ 工作者 ${workerId} 处理失败: ${message.id}, 耗时: ${duration}ms, 错误: ${error.message}`,
          );
          throw error; // 重新抛出错误，让 coreService 处理 nack
        }
      },
      {
        noAck: false, // 手动确认
        exclusive: false,
      },
    );
  }

  /**
   * 启动多个工作者消费同一个队列
   */
  async startMultipleWorkers<T>(
    queueName: string,
    handler: (data: T) => Promise<void>,
    workerCount: number = 3,
    options?: {
      prefetch?: number;
    },
  ): Promise<void> {
    this.logger.log(`🚀 启动 ${workerCount} 个工作者消费队列: ${queueName}`);

    const workers: any[] = [];
    for (let i = 0; i < workerCount; i++) {
      const workerId = `${queueName}-worker-${i + 1}`;
      workers.push(
        this.consumeQueue(queueName, handler, {
          ...options,
          workerId,
        }),
      );
    }

    await Promise.all(workers);
  }

  /**
   * 测试消费
   */
  async consumeOrderTestEvent(
    handler: (data: any) => Promise<void>,
  ): Promise<void> {
    await this.consumeQueue('order-tasks', handler);
  }
}
