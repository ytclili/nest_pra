import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQCoreService } from './rabbitmq-core.service';
import { DeadLetterQueueService } from './dead-letter-queue.service';
import { Message } from '../interfaces/rabbitmq.interface';

/**
 * 手动ACK演示服务
 * 演示如何使用手动ACK处理消息，包括重试和死信队列
 */
@Injectable()
export class ManualAckDemoService {
  private readonly logger = new Logger(ManualAckDemoService.name);
  private readonly DEMO_QUEUE = 'manual-ack-demo';
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly coreService: RabbitMQCoreService,
    private readonly deadLetterService: DeadLetterQueueService,
  ) {}

  /**
   * 初始化演示队列和死信队列
   */
  async initializeDemoQueue(): Promise<void> {
    this.logger.log('🔧 初始化手动ACK演示队列...');

    // 设置死信队列
    await this.deadLetterService.setupDeadLetterQueue(this.DEMO_QUEUE, {
      maxRetries: this.MAX_RETRIES,
      messageTtl: 60000, // 消息TTL 60秒
    });

    this.logger.log('✅ 手动ACK演示队列初始化完成');
  }

  /**
   * 发送演示消息到队列
   */
  async sendDemoMessages(count: number = 10): Promise<void> {
    this.logger.log(`📤 发送 ${count} 条演示消息...`);

    const messages: any[] = [];
    for (let i = 1; i <= count; i++) {
      const message = {
        id: `demo-${i}`,
        content: `这是第 ${i} 条演示消息`,
        shouldFail: Math.random() < 0.3, // 30% 概率失败
        processTime: Math.floor(Math.random() * 3000) + 1000, // 1-4秒处理时间
        timestamp: new Date().toISOString(),
      };
      messages.push(message);
    }

    // 批量发送消息
    for (const message of messages) {
      await this.coreService.sendToQueue(this.DEMO_QUEUE, message, {
        persistent: true,
        headers: {
          'retry-count': 0,
          'original-queue': this.DEMO_QUEUE,
        },
      });
    }

    this.logger.log(`✅ ${count} 条演示消息发送完成`);
  }

  /**
   * 启动手动ACK消费者
   */
  async startManualAckConsumer(
    options: {
      prefetch?: number;
      workerId?: string;
    } = {},
  ): Promise<void> {
    const { prefetch = 1, workerId = 'manual-ack-worker' } = options;

    this.logger.log(`🚀 启动手动ACK消费者: ${workerId}, 预取: ${prefetch}`);

    await this.coreService.consumeWithManualAck(
      this.DEMO_QUEUE,
      async (message: any, ackCallback) => {
        const startTime = Date.now();
        const retryCount = message.retryCount || 0;

        this.logger.log(
          `📨 [${workerId}] 开始处理消息: ${message.data.id}, 重试次数: ${retryCount}`,
        );
        this.logger.debug(`📄 [${workerId}] 消息内容:`, message.data);

        try {
          // 模拟业务处理
          await this.processBusinessLogic(message.data, workerId);

          // 处理成功，手动ACK
          ackCallback.ack();

          const duration = Date.now() - startTime;
          this.logger.log(
            `✅ [${workerId}] 消息处理成功: ${message.data.id}, 耗时: ${duration}ms`,
          );
        } catch (error) {
          const duration = Date.now() - startTime;
          this.logger.error(
            `❌ [${workerId}] 消息处理失败: ${message.data.id}, 耗时: ${duration}ms, 错误: ${error.message}`,
          );

          // 检查重试次数
          if (retryCount < this.MAX_RETRIES) {
            // 重新入队，等待重试
            ackCallback.nack(true); // requeue = true
            this.logger.warn(
              `🔄 [${workerId}] 消息重新入队: ${message.data.id}, 重试次数: ${retryCount + 1}/${this.MAX_RETRIES}`,
            );
          } else {
            // 超过最大重试次数，拒绝消息（进入死信队列）
            ackCallback.nack(false); // requeue = false，进入死信队列
            this.logger.error(
              `💀 [${workerId}] 消息超过最大重试次数，进入死信队列: ${message.data.id}`,
            );
          }
        }
      },
      { prefetch },
    );
  }

  /**
   * 启动多个工作者
   */
  async startMultipleWorkers(
    workerCount: number = 3,
    prefetch: number = 1,
  ): Promise<void> {
    this.logger.log(`👥 启动 ${workerCount} 个手动ACK工作者...`);

    const workers: Promise<void>[] = [];
    for (let i = 0; i < workerCount; i++) {
      const workerId = `worker-${i + 1}`;
      workers.push(this.startManualAckConsumer({ prefetch, workerId }));
    }

    await Promise.all(workers);
    this.logger.log(`✅ ${workerCount} 个工作者启动完成`);
  }

  /**
   * 消费死信队列
   */
  async startDeadLetterConsumer(): Promise<void> {
    this.logger.log('💀 启动死信队列消费者...');

    await this.deadLetterService.consumeDeadLetterQueue(
      this.DEMO_QUEUE,
      async (message: Message) => {
        this.logger.warn(`💀 处理死信消息: ${message.data.id}`);
        this.logger.warn(`💀 死信消息内容:`, message.data);

        // 这里可以实现人工处理逻辑
        // 1. 记录到数据库
        // 2. 发送告警邮件
        // 3. 推送到监控系统
        // 4. 等待人工处理

        await this.handleDeadLetterMessage(message);

        this.logger.log(`✅ 死信消息处理完成: ${message.data.id}`);
      },
    );
  }

  /**
   * 模拟业务处理逻辑
   */
  private async processBusinessLogic(
    messageData: any,
    workerId: string,
  ): Promise<void> {
    const { id, content, shouldFail, processTime } = messageData;

    this.logger.log(`⚙️ [${workerId}] 处理业务逻辑: ${id}`);

    // 模拟处理时间
    await new Promise((resolve) => setTimeout(resolve, processTime));

    // 模拟业务逻辑
    if (content.includes('重要')) {
      this.logger.log(`🔥 [${workerId}] 处理重要消息: ${id}`);
      // 重要消息的特殊处理逻辑
    }

    // 模拟失败情况
    if (shouldFail) {
      const errorMessages = [
        '数据库连接失败',
        '第三方API调用超时',
        '业务规则验证失败',
        '网络异常',
        '内存不足',
      ];
      const randomError =
        errorMessages[Math.floor(Math.random() * errorMessages.length)];
      throw new Error(randomError);
    }

    this.logger.log(`✨ [${workerId}] 业务逻辑处理完成: ${id}`);
  }

  /**
   * 处理死信消息
   */
  private async handleDeadLetterMessage(message: any): Promise<void> {
    const { id, content } = message.data;

    // 模拟人工处理逻辑
    this.logger.warn(`🔧 人工处理死信消息: ${id}`);

    // 1. 记录到错误日志表
    await this.logErrorToDatabase(message);

    // 2. 发送告警通知
    await this.sendAlertNotification(message);

    // 3. 尝试修复数据
    await this.attemptDataRepair(message);

    this.logger.log(`🛠️ 死信消息人工处理完成: ${id}`);
  }

  /**
   * 记录错误到数据库
   */
  private async logErrorToDatabase(message: any): Promise<void> {
    // 模拟数据库记录
    this.logger.log(`📝 记录错误到数据库: ${message.data.id}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * 发送告警通知
   */
  private async sendAlertNotification(message: any): Promise<void> {
    // 模拟发送告警
    this.logger.log(`🚨 发送告警通知: ${message.data.id}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  /**
   * 尝试修复数据
   */
  private async attemptDataRepair(message: any): Promise<void> {
    // 模拟数据修复
    this.logger.log(`🔧 尝试修复数据: ${message.data.id}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats(): Promise<{
    mainQueue: any;
    deadLetterQueue: any;
  }> {
    const [mainQueue, deadLetterStats] = await Promise.all([
      this.coreService.getQueueInfo(this.DEMO_QUEUE).catch(() => null),
      this.deadLetterService
        .getDeadLetterStats(this.DEMO_QUEUE)
        .catch(() => null),
    ]);

    return {
      mainQueue,
      deadLetterQueue: deadLetterStats?.deadLetterQueue || null,
    };
  }

  /**
   * 清空所有队列
   */
  async clearAllQueues(): Promise<void> {
    this.logger.log('🧹 清空所有演示队列...');

    try {
      await this.coreService.purgeQueue(this.DEMO_QUEUE);
      await this.deadLetterService.purgeDeadLetterQueue(this.DEMO_QUEUE);
      this.logger.log('✅ 所有演示队列已清空');
    } catch (error) {
      this.logger.error(`清空队列失败: ${error.message}`);
    }
  }
}
