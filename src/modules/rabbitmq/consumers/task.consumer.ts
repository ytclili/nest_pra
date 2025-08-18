import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import type { RabbitMQService } from '../services/rabbitmq.service';
import type { Message } from '../interfaces/rabbitmq.interface';

/**
 * 任务消费者
 * 处理各种后台任务
 */
@Injectable()
export class TaskConsumer implements OnModuleInit {
  private readonly logger = new Logger(TaskConsumer.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async onModuleInit() {
    await this.setupQueues();
    await this.startConsumers();
  }

  /**
   * 设置队列
   */
  private async setupQueues(): Promise<void> {
    // 设置定时任务延迟队列
    await this.rabbitMQService['delayQueue'].setupDelayQueue('scheduled-tasks');

    // 设置系统事件主题交换机
    await this.rabbitMQService['topicQueue'].setupTopicExchange(
      'system-events',
    );

    // 绑定不同类型的事件队列
    await this.rabbitMQService.bindToTopic(
      'system-events',
      'events.user',
      'user.*',
    );
    await this.rabbitMQService.bindToTopic(
      'system-events',
      'events.order',
      'order.*',
    );
    await this.rabbitMQService.bindToTopic(
      'system-events',
      'events.system',
      'system.*',
    );
  }

  /**
   * 启动消费者
   */
  private async startConsumers(): Promise<void> {
    // 消费定时任务
    await this.rabbitMQService.consumeDelayQueue(
      'scheduled-tasks',
      this.handleScheduledTask.bind(this),
    );

    // 消费用户事件
    await this.rabbitMQService.consumeTopicQueue(
      'events.user',
      this.handleUserEvent.bind(this),
    );

    // 消费订单事件
    await this.rabbitMQService.consumeTopicQueue(
      'events.order',
      this.handleOrderEvent.bind(this),
    );

    // 消费系统事件
    await this.rabbitMQService.consumeTopicQueue(
      'events.system',
      this.handleSystemEvent.bind(this),
    );
  }

  /**
   * 处理定时任务
   */
  private async handleScheduledTask(
    message: Message<{
      taskName: string;
      data: any;
      executeAt: string;
    }>,
  ): Promise<void> {
    const { taskName, data, executeAt } = message.data;

    this.logger.log(`执行定时任务: ${taskName}, 计划执行时间: ${executeAt}`);

    try {
      // 根据任务名称执行不同的任务
      switch (taskName) {
        case 'send-reminder':
          await this.handleReminderTask(data);
          break;
        case 'cleanup-temp-files':
          await this.handleCleanupTask(data);
          break;
        case 'generate-report':
          await this.handleReportTask(data);
          break;
        default:
          this.logger.warn(`未知的任务类型: ${taskName}`);
      }

      this.logger.log(`定时任务执行成功: ${message.id}`);
    } catch (error) {
      this.logger.error(
        `定时任务执行失败: ${message.id}, 错误: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 处理用户事件
   */
  private async handleUserEvent(
    message: Message<{
      entity: string;
      action: string;
      data: any;
      timestamp: string;
    }>,
  ): Promise<void> {
    const { entity, action, data } = message.data;

    this.logger.log(`处理用户事件: ${entity}.${action}`);

    try {
      switch (action) {
        case 'created':
          await this.handleUserCreated(data);
          break;
        case 'updated':
          await this.handleUserUpdated(data);
          break;
        case 'deleted':
          await this.handleUserDeleted(data);
          break;
        default:
          this.logger.log(`用户事件: ${action}`);
      }
    } catch (error) {
      this.logger.error(`用户事件处理失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理订单事件
   */
  private async handleOrderEvent(
    message: Message<{
      entity: string;
      action: string;
      data: any;
      timestamp: string;
    }>,
  ): Promise<void> {
    const { entity, action, data } = message.data;

    this.logger.log(`处理订单事件: ${entity}.${action}`);

    try {
      switch (action) {
        case 'created':
          await this.handleOrderCreated(data);
          break;
        case 'paid':
          await this.handleOrderPaid(data);
          break;
        case 'cancelled':
          await this.handleOrderCancelled(data);
          break;
        default:
          this.logger.log(`订单事件: ${action}`);
      }
    } catch (error) {
      this.logger.error(`订单事件处理失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理系统事件
   */
  private async handleSystemEvent(
    message: Message<{
      entity: string;
      action: string;
      data: any;
      timestamp: string;
    }>,
  ): Promise<void> {
    const { entity, action, data } = message.data;

    this.logger.log(`处理系统事件: ${entity}.${action}`);

    try {
      // 系统事件处理逻辑
      this.logger.log(`系统事件处理: ${action}`);
    } catch (error) {
      this.logger.error(`系统事件处理失败: ${error.message}`);
      throw error;
    }
  }

  // ==================== 具体任务处理方法 ====================

  private async handleReminderTask(data: any): Promise<void> {
    this.logger.log('执行提醒任务');
    // 实现提醒逻辑
  }

  private async handleCleanupTask(data: any): Promise<void> {
    this.logger.log('执行清理任务');
    // 实现清理逻辑
  }

  private async handleReportTask(data: any): Promise<void> {
    this.logger.log('执行报告生成任务');
    // 实现报告生成逻辑
  }

  private async handleUserCreated(userData: any): Promise<void> {
    this.logger.log('处理用户创建事件');
    // 发送欢迎邮件等
  }

  private async handleUserUpdated(userData: any): Promise<void> {
    this.logger.log('处理用户更新事件');
    // 更新相关缓存等
  }

  private async handleUserDeleted(userData: any): Promise<void> {
    this.logger.log('处理用户删除事件');
    // 清理用户相关数据等
  }

  private async handleOrderCreated(orderData: any): Promise<void> {
    this.logger.log('处理订单创建事件');
    // 发送订单确认等
  }

  private async handleOrderPaid(orderData: any): Promise<void> {
    this.logger.log('处理订单支付事件');
    // 发送支付确认等
  }

  private async handleOrderCancelled(orderData: any): Promise<void> {
    this.logger.log('处理订单取消事件');
    // 发送取消通知等
  }
}
