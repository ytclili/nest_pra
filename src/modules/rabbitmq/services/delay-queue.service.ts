import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQCoreService } from './rabbitmq-core.service';
import {
  DelayQueueOptions,
  MessageHandler,
  PublishOptions,
} from '../interfaces/rabbitmq.interface';

/**
 * 延迟队列服务
 * 实现消息延迟投递功能
 */
@Injectable()
export class DelayQueueService {
  private readonly logger = new Logger(DelayQueueService.name);
  private readonly delayExchangePrefix = 'delay.exchange';
  private readonly delayQueuePrefix = 'delay.queue';

  constructor(private readonly coreService: RabbitMQCoreService) {}

  /**
   * 初始化延迟队列
   * 使用 RabbitMQ 延迟插件或 TTL + 死信队列实现
   */
  async setupDelayQueue(
    queueName: string,
    options: DelayQueueOptions = {},
  ): Promise<void> {
    const delayExchange =
      options.delayExchange || `${this.delayExchangePrefix}.${queueName}`;
    const targetQueue = queueName;

    try {
      // 方案1: 使用 RabbitMQ 延迟插件 (推荐)
      await this.setupDelayWithPlugin(delayExchange, targetQueue, options);
    } catch (error) {
      this.logger.warn('延迟插件不可用，使用 TTL + 死信队列方案');
      // 方案2: 使用 TTL + 死信队列
      await this.setupDelayWithTTL(delayExchange, targetQueue, options);
    }
  }

  /**
   * 发送延迟消息
   */
  async sendDelayMessage<T>(
    queueName: string,
    data: T,
    delayMs: number,
    options: PublishOptions = {},
  ): Promise<boolean> {
    const delayExchange = `${this.delayExchangePrefix}.${queueName}`;

    // 设置延迟时间
    const publishOptions: PublishOptions = {
      ...options,
      delay: delayMs,
      headers: {
        ...options.headers,
        'x-delay': delayMs,
      },
    };

    return this.coreService.publish(
      delayExchange,
      queueName,
      data,
      publishOptions,
    );
  }

  /**
   * 消费延迟队列
   */
  async consumeDelayQueue<T>(
    queueName: string,
    handler: MessageHandler<T>,
  ): Promise<void> {
    await this.coreService.consume(queueName, handler);
    this.logger.log(`开始消费延迟队列: ${queueName}`);
  }

  /**
   * 使用延迟插件设置延迟队列
   */
  private async setupDelayWithPlugin(
    delayExchange: string,
    targetQueue: string,
    options: DelayQueueOptions,
  ): Promise<void> {
    // 声明延迟交换机 (需要 rabbitmq-delayed-message-exchange 插件)
    await this.coreService.assertExchange(delayExchange, {
      type: 'x-delayed-message' as any,
      durable: true,
      arguments: {
        'x-delayed-type': 'direct',
      },
    });

    // 声明目标队列
    await this.coreService.assertQueue(targetQueue, {
      durable: options.durable ?? true,
      arguments: options.arguments,
    });

    // 绑定队列到延迟交换机
    await this.coreService.bindQueue(targetQueue, delayExchange, targetQueue);

    this.logger.log(`延迟队列设置完成 (插件模式): ${targetQueue}`);
  }

  /**
   * 使用 TTL + 死信队列设置延迟队列
   */
  private async setupDelayWithTTL(
    delayExchange: string,
    targetQueue: string,
    options: DelayQueueOptions,
  ): Promise<void> {
    const delayQueue = `${this.delayQueuePrefix}.${targetQueue}`;
    const targetExchange = `direct.${targetQueue}`;

    // 声明目标交换机
    await this.coreService.assertExchange(targetExchange, {
      type: 'direct',
      durable: true,
    });

    // 声明目标队列
    await this.coreService.assertQueue(targetQueue, {
      durable: options.durable ?? true,
      arguments: options.arguments,
    });

    // 绑定目标队列到目标交换机
    await this.coreService.bindQueue(targetQueue, targetExchange, targetQueue);

    // 声明延迟交换机
    await this.coreService.assertExchange(delayExchange, {
      type: 'direct',
      durable: true,
    });

    // 声明延迟队列 (带TTL和死信配置)
    await this.coreService.assertQueue(delayQueue, {
      durable: true,
      arguments: {
        'x-message-ttl': options.maxDelay || 86400000, // 默认24小时
        'x-dead-letter-exchange': targetExchange,
        'x-dead-letter-routing-key': targetQueue,
      },
    });

    // 绑定延迟队列到延迟交换机
    await this.coreService.bindQueue(delayQueue, delayExchange, targetQueue);

    this.logger.log(`延迟队列设置完成 (TTL模式): ${targetQueue}`);
  }

  /**
   * 取消延迟消息 (仅在使用TTL模式时有效)
   */
  async cancelDelayMessage(
    queueName: string,
    messageId: string,
  ): Promise<boolean> {
    // 这个功能需要额外的实现，比如使用Redis存储消息ID映射
    // 或者使用RabbitMQ的消息确认机制
    this.logger.warn('取消延迟消息功能需要额外实现');
    return false;
  }

  /**
   * 获取延迟队列统计信息
   */
  async getDelayQueueStats(queueName: string): Promise<{
    delayQueue: any;
    targetQueue: any;
  }> {
    const delayQueue = `${this.delayQueuePrefix}.${queueName}`;

    const [delayQueueInfo, targetQueueInfo] = await Promise.all([
      this.coreService.getQueueInfo(delayQueue).catch(() => null),
      this.coreService.getQueueInfo(queueName).catch(() => null),
    ]);

    return {
      delayQueue: delayQueueInfo,
      targetQueue: targetQueueInfo,
    };
  }
}
