import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQCoreService } from './rabbitmq-core.service';
import {
  QueueOptions,
  MessageHandler,
  PublishOptions,
} from '../interfaces/rabbitmq.interface';

/**
 * 广播队列服务
 * 实现消息广播功能，将消息发送到所有绑定的队列
 */
@Injectable()
export class FanoutQueueService {
  private readonly logger = new Logger(FanoutQueueService.name);
  private readonly fanoutExchangePrefix = 'fanout.exchange';

  constructor(private readonly coreService: RabbitMQCoreService) {}

  /**
   * 设置广播交换机
   */
  async setupFanoutExchange(exchangeName: string): Promise<void> {
    const fullExchangeName = `${this.fanoutExchangePrefix}.${exchangeName}`;

    await this.coreService.assertExchange(fullExchangeName, {
      type: 'fanout',
      durable: true,
    });

    this.logger.log(`广播交换机设置完成: ${fullExchangeName}`);
  }

  /**
   * 绑定队列到广播交换机
   */
  async bindQueueToFanout(
    exchangeName: string,
    queueName: string,
    options: QueueOptions = {},
  ): Promise<void> {
    const fullExchangeName = `${this.fanoutExchangePrefix}.${exchangeName}`;

    // 声明队列
    await this.coreService.assertQueue(queueName, {
      durable: options.durable ?? true,
      exclusive: options.exclusive ?? false,
      autoDelete: options.autoDelete ?? false,
      arguments: options.arguments,
    });

    // 绑定队列到广播交换机 (fanout类型不需要路由键)
    await this.coreService.bindQueue(queueName, fullExchangeName, '');

    this.logger.log(`队列 ${queueName} 绑定到广播交换机 ${fullExchangeName}`);
  }

  /**
   * 广播消息
   */
  async broadcast<T>(
    exchangeName: string,
    data: T,
    options: PublishOptions = {},
  ): Promise<boolean> {
    const fullExchangeName = `${this.fanoutExchangePrefix}.${exchangeName}`;

    // 广播消息 (fanout类型不需要路由键)
    const result = await this.coreService.publish(
      fullExchangeName,
      '', // 空路由键
      data,
      options,
    );

    this.logger.debug(`消息广播到交换机: ${fullExchangeName}`);

    return result;
  }

  /**
   * 消费广播队列
   */
  async consumeFanoutQueue<T>(
    queueName: string,
    handler: MessageHandler<T>,
  ): Promise<void> {
    await this.coreService.consume(queueName, handler);
    this.logger.log(`开始消费广播队列: ${queueName}`);
  }

  /**
   * 创建临时广播队列
   * 适用于需要临时接收广播消息的场景
   */
  async createTemporaryFanoutQueue(
    exchangeName: string,
    handler: MessageHandler<any>,
  ): Promise<string> {
    const fullExchangeName = `${this.fanoutExchangePrefix}.${exchangeName}`;

    // 创建临时队列 (独占、自动删除)
    const queueResult = await this.coreService.assertQueue('', {
      exclusive: true,
      autoDelete: true,
    });

    const tempQueueName = queueResult.queue;

    // 绑定临时队列到广播交换机
    await this.coreService.bindQueue(tempQueueName, fullExchangeName, '');

    // 开始消费
    await this.coreService.consume(tempQueueName, handler);

    this.logger.log(`创建临时广播队列: ${tempQueueName}`);

    return tempQueueName;
  }

  /**
   * 批量绑定队列到广播交换机
   */
  async bindMultipleQueues(
    exchangeName: string,
    queueNames: string[],
    options: QueueOptions = {},
  ): Promise<void> {
    const fullExchangeName = `${this.fanoutExchangePrefix}.${exchangeName}`;

    // 确保交换机存在
    await this.setupFanoutExchange(exchangeName);

    // 批量绑定队列
    const bindPromises = queueNames.map((queueName) =>
      this.bindQueueToFanout(exchangeName, queueName, options),
    );

    await Promise.all(bindPromises);

    this.logger.log(
      `批量绑定 ${queueNames.length} 个队列到广播交换机 ${fullExchangeName}`,
    );
  }

  /**
   * 获取广播交换机绑定的队列列表
   */
  async getFanoutBindings(exchangeName: string): Promise<any[]> {
    // 注意: 这个功能需要RabbitMQ Management API
    // 这里只是示例，实际实现需要调用Management API
    this.logger.warn('获取绑定列表需要调用 RabbitMQ Management API');
    return [];
  }

  /**
   * 解绑队列从广播交换机
   */
  async unbindQueueFromFanout(
    exchangeName: string,
    queueName: string,
  ): Promise<void> {
    const fullExchangeName = `${this.fanoutExchangePrefix}.${exchangeName}`;
    const channel = this.coreService['connectionService'].getChannel();

    await channel.unbindQueue(queueName, fullExchangeName, '');

    this.logger.log(`队列 ${queueName} 从广播交换机 ${fullExchangeName} 解绑`);
  }
}
