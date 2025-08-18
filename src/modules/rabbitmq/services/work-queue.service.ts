import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQCoreService } from './rabbitmq-core.service';
import {
  QueueOptions,
  MessageHandler,
  PublishOptions,
  Message,
} from '../interfaces/rabbitmq.interface';

/**
 * 工作队列服务
 * 实现负载均衡的工作队列模式
 */
@Injectable()
export class WorkQueueService {
  private readonly logger = new Logger(WorkQueueService.name);
  private readonly workQueuePrefix = 'work.queue';

  constructor(private readonly coreService: RabbitMQCoreService) {}

  /**
   * 设置工作队列
   */
  async setupWorkQueue(
    queueName: string,
    options: QueueOptions = {},
  ): Promise<void> {
    const fullQueueName = `${this.workQueuePrefix}.${queueName}`;

    await this.coreService.assertQueue(fullQueueName, {
      durable: options.durable ?? true,
      exclusive: options.exclusive ?? false,
      autoDelete: options.autoDelete ?? false,
      arguments: options.arguments,
    });

    this.logger.log(`工作队列设置完成: ${fullQueueName}`);
  }

  /**
   * 发送工作任务
   */
  async sendWork<T>(
    queueName: string,
    data: T,
    options: PublishOptions = {},
  ): Promise<boolean> {
    const fullQueueName = `${this.workQueuePrefix}.${queueName}`;

    const result = await this.coreService.sendToQueue(fullQueueName, data, {
      persistent: options.persistent ?? true,
      ...options,
    });

    this.logger.debug(`工作任务发送到队列: ${fullQueueName}`);

    return result;
  }

  /**
   * 消费工作队列 (单个消费者)
   */
  async consumeWork<T>(
    queueName: string,
    handler: MessageHandler<T>,
    workerId?: string,
  ): Promise<void> {
    const fullQueueName = `${this.workQueuePrefix}.${queueName}`;
    const id = workerId || `worker-${Math.random().toString(36).substr(2, 9)}`;

    await this.coreService.consume(fullQueueName, async (message) => {
      this.logger.debug(`工作者 ${id} 处理任务: ${message.id}`);

      const startTime = Date.now();
      try {
        await handler(message as Message<T>);
        const duration = Date.now() - startTime;
        this.logger.debug(
          `工作者 ${id} 完成任务: ${message.id}, 耗时: ${duration}ms`,
        );
      } catch (error) {
        this.logger.error(
          `工作者 ${id} 处理任务失败: ${message.id}, 错误: ${error.message}`,
        );
        throw error;
      }
    });

    this.logger.log(`工作者 ${id} 开始消费队列: ${fullQueueName}`);
  }

  /**
   * 启动多个工作者
   */
  async startMultipleWorkers<T>(
    queueName: string,
    handler: MessageHandler<T>,
    workerCount = 3,
  ): Promise<void> {
    const workers: Promise<void>[] = [];

    for (let i = 0; i < workerCount; i++) {
      const workerId = `worker-${i + 1}`;
      workers.push(this.consumeWork(queueName, handler, workerId));
    }

    await Promise.all(workers);

    this.logger.log(`启动 ${workerCount} 个工作者消费队列: ${queueName}`);
  }

  /**
   * 批量发送工作任务
   */
  async sendBatchWork<T>(
    queueName: string,
    tasks: T[],
    options: PublishOptions = {},
  ): Promise<boolean[]> {
    const sendPromises = tasks.map((task) =>
      this.sendWork(queueName, task, options),
    );

    const results = await Promise.all(sendPromises);

    this.logger.log(`批量发送 ${tasks.length} 个工作任务到队列: ${queueName}`);

    return results;
  }

  /**
   * 设置图片处理工作队列
   */
  async setupImageProcessingQueue(): Promise<void> {
    await this.setupWorkQueue('image-processing');
    this.logger.log('图片处理工作队列设置完成');
  }

  /**
   * 发送图片处理任务
   */
  async sendImageProcessingTask(task: {
    imageUrl: string;
    operations: string[];
    outputFormat: string;
    userId: string;
  }): Promise<boolean> {
    return this.sendWork('image-processing', {
      ...task,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * 消费图片处理队列
   */
  async consumeImageProcessingQueue(
    handler: MessageHandler<{
      imageUrl: string;
      operations: string[];
      outputFormat: string;
      userId: string;
      createdAt: string;
    }>,
    workerCount = 2,
  ): Promise<void> {
    await this.startMultipleWorkers('image-processing', handler, workerCount);
  }
}
